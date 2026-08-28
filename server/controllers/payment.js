import crypto from "crypto";
import users from "../Modals/Auth.js";
import {
  getRazorpayCredentials,
  getRazorpayInstance,
} from "../config/razorpay.js";
import { getPlanAmountInPaise, getPlanRupees } from "../utils/plans.js";
import { sendPlanInvoiceEmail } from "../services/email.js";

const PREMIUM_CURRENCY = "INR";

export const createOrder = async (req, res) => {
  try {
    const { plan } = req.body;
    const allowedPlans = ["bronze", "silver", "gold"];

    if (!allowedPlans.includes(plan)) {
      return res.status(400).json({ message: "Invalid plan" });
    }

    const currentPlan = req.authUser.plan || "free";
    if (currentPlan === plan) {
      return res.status(400).json({ message: "You already have this plan" });
    }

    const amount = getPlanAmountInPaise(plan);
    const { keyId } = getRazorpayCredentials();
    const razorpay = getRazorpayInstance();

    console.log("Creating Razorpay order with key:", keyId);

    // Razorpay receipt max length is 40 characters
    const receipt = `prem_${Date.now()}`.slice(0, 40);

    const order = await razorpay.orders.create({
      amount,
      currency: PREMIUM_CURRENCY,
      receipt,
      notes: {
        userId: req.authUser._id.toString(),
        plan,
      },
    });

    console.log("Order created successfully:", order.id);

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
    });
  } catch (error) {
    console.error("=== Create order error ===");
    console.error("message:", error.message);
    console.error("statusCode:", error.statusCode);
    console.error("description:", error?.error?.description);
    console.error("=========================");

    if (error.message?.includes("not configured") || error.message?.includes("placeholder")) {
      return res.status(500).json({ message: error.message });
    }

    const razorpayDescription = error?.error?.description;
    const isRazorpayAuthError =
      error?.statusCode === 401 ||
      razorpayDescription?.toLowerCase().includes("authentication failed");

    if (isRazorpayAuthError) {
      const { keyId } = getRazorpayCredentials();
      return res.status(500).json({
        message: `Razorpay rejected API key "${keyId}". Regenerate a Test Key pair in Razorpay Dashboard and update both RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env, then restart the server.`,
      });
    }

    return res.status(500).json({
      message:
        razorpayDescription ||
        error.message ||
        "Failed to create payment order",
    });
  }
};

export const verifyPayment = async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
    req.body;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return res
      .status(400)
      .json({ message: "Missing payment verification fields" });
  }

  try {
    const { keySecret } = getRazorpayCredentials();
    if (!keySecret) {
      return res.status(500).json({ message: "Razorpay is not configured" });
    }

    // 1) Verify the signature: HMAC-SHA256 of "order_id|payment_id".
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(payload)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    // 2) Trust the server-side order, NOT the client. The plan (and amount) are
    //    read back from the order notes we set in createOrder, so a client can't
    //    pay for bronze and claim gold.
    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.fetch(razorpay_order_id);
    const plan = order?.notes?.plan;
    const orderUserId = order?.notes?.userId;

    const allowedPlans = ["bronze", "silver", "gold"];
    if (!allowedPlans.includes(plan)) {
      return res
        .status(400)
        .json({ message: "Order is missing a valid plan" });
    }

    // 3) The order must belong to the authenticated user.
    if (orderUserId && orderUserId !== req.authUser._id.toString()) {
      return res
        .status(403)
        .json({ message: "This order does not belong to your account" });
    }

    // 4) Confirm the paid amount matches the plan's price.
    if (order.amount !== getPlanAmountInPaise(plan)) {
      return res
        .status(400)
        .json({ message: "Paid amount does not match the plan price" });
    }

    const updatedUser = await users.findByIdAndUpdate(
      req.authUser._id,
      { $set: { plan, planActivatedAt: new Date() } },
      { new: true }
    );

    // 5) Send the invoice/confirmation email. Best-effort — never fail the
    //    payment because email delivery hiccuped.
    if (updatedUser?.email) {
      try {
        await sendPlanInvoiceEmail({
          to: updatedUser.email,
          name: updatedUser.name || updatedUser.channelname,
          plan,
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          amountRupees: getPlanRupees(plan),
        });
      } catch (emailError) {
        console.error("Invoice email failed:", emailError.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `${plan} plan activated successfully`,
      result: updatedUser,
    });
  } catch (error) {
    console.error("Verify payment error:", error.message);
    return res.status(500).json({ message: "Payment verification failed" });
  }
};

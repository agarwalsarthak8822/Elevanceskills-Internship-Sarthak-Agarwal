import crypto from "crypto";
import users from "../Modals/Auth.js";
import {
  getRazorpayCredentials,
  getRazorpayInstance,
} from "../config/razorpay.js";
import {
  getPlanAmountInPaise,
} from "../utils/plans.js";

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
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, plan } =
    req.body;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return res.status(400).json({ message: "Missing payment verification fields" });
  }

  const allowedPlans = ["bronze", "silver", "gold"];
  if (!allowedPlans.includes(plan)) {
    return res.status(400).json({ message: "Invalid plan" });
  }

  try {
    const { keySecret } = getRazorpayCredentials();
    if (!keySecret) {
      return res.status(500).json({ message: "Razorpay is not configured" });
    }

    // Razorpay signature = HMAC-SHA256 of "order_id|payment_id" using key_secret
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(payload)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const updatedUser = await users.findByIdAndUpdate(
      req.authUser._id,
      { $set: { plan } },
      { new: true }
    );

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

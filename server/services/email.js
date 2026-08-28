import nodemailer from "nodemailer";
import { getPlanRupees, getWatchLimitMinutes } from "../utils/plans.js";

const getTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
};

export const sendOtpEmail = async (to, otp) => {
  const transporter = getTransporter();

  if (!transporter) {
    console.log(`[DEV MODE] Email OTP for ${to}: ${otp}`);
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "YourTube sign-in verification code",
    text: `Your YourTube verification code is: ${otp}. It expires in 5 minutes.`,
    html: `<p>Your YourTube verification code is: <strong>${otp}</strong></p><p>It expires in 5 minutes.</p>`,
  });
};

const formatPlanName = (plan) =>
  plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "Free";

const buildInvoiceHtml = ({
  name,
  plan,
  amountRupees,
  invoiceNumber,
  paymentId,
  orderId,
  dateLabel,
}) => {
  const watchLimit = getWatchLimitMinutes(plan);
  const watchLimitLabel =
    watchLimit === null ? "Unlimited" : `${watchLimit} minutes per video`;

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#111;">
    <div style="background:#dc2626;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
      <h1 style="margin:0;font-size:20px;">YourTube</h1>
      <p style="margin:4px 0 0;font-size:13px;opacity:.9;">Payment receipt & invoice</p>
    </div>
    <div style="border:1px solid #eee;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
      <p style="font-size:15px;">Hi ${name || "there"},</p>
      <p style="font-size:15px;">Thank you for upgrading. Your <strong>${formatPlanName(
        plan
      )}</strong> plan is now active.</p>

      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        <tr>
          <td style="padding:8px 0;color:#666;">Invoice number</td>
          <td style="padding:8px 0;text-align:right;font-weight:600;">${invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#666;">Date</td>
          <td style="padding:8px 0;text-align:right;">${dateLabel}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#666;">Plan</td>
          <td style="padding:8px 0;text-align:right;font-weight:600;">${formatPlanName(
            plan
          )}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#666;">Watch time</td>
          <td style="padding:8px 0;text-align:right;">${watchLimitLabel}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#666;">Downloads</td>
          <td style="padding:8px 0;text-align:right;">Unlimited</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#666;">Payment ID</td>
          <td style="padding:8px 0;text-align:right;font-family:monospace;font-size:12px;">${paymentId}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#666;">Order ID</td>
          <td style="padding:8px 0;text-align:right;font-family:monospace;font-size:12px;">${orderId}</td>
        </tr>
        <tr style="border-top:2px solid #eee;">
          <td style="padding:12px 0;font-size:16px;font-weight:700;">Amount paid</td>
          <td style="padding:12px 0;text-align:right;font-size:16px;font-weight:700;">₹${amountRupees}.00</td>
        </tr>
      </table>

      <p style="font-size:13px;color:#888;">This is a computer-generated receipt for a test-mode transaction and needs no signature.</p>
    </div>
  </div>`;
};

// Sends a plan-purchase confirmation email that doubles as an invoice.
// Best-effort: callers should not fail the payment if this throws.
export const sendPlanInvoiceEmail = async ({
  to,
  name,
  plan,
  paymentId,
  orderId,
  amountRupees,
}) => {
  const resolvedAmount =
    typeof amountRupees === "number" ? amountRupees : getPlanRupees(plan);
  const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
  const dateLabel = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const transporter = getTransporter();
  if (!transporter) {
    console.log(
      `[DEV MODE] Invoice email for ${to}: ${formatPlanName(
        plan
      )} plan, ₹${resolvedAmount}, invoice ${invoiceNumber}, payment ${paymentId}`
    );
    return;
  }

  const html = buildInvoiceHtml({
    name,
    plan,
    amountRupees: resolvedAmount,
    invoiceNumber,
    paymentId,
    orderId,
    dateLabel,
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: `Your YourTube ${formatPlanName(plan)} plan — invoice ${invoiceNumber}`,
    text: `Thank you for upgrading to the ${formatPlanName(
      plan
    )} plan. Amount paid: ₹${resolvedAmount}. Invoice: ${invoiceNumber}. Payment ID: ${paymentId}.`,
    html,
  });
};

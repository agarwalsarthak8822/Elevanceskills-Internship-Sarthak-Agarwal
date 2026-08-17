import Otp from "../Modals/Otp.js";
import users from "../Modals/Auth.js";
import { sendOtpEmail } from "../services/email.js";

const OTP_EXPIRY_MS = 5 * 60 * 1000;

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const sendOtp = async (req, res) => {
  const { userId, channel } = req.body;

  if (!userId || !channel) {
    return res.status(400).json({ message: "userId and channel are required" });
  }

  if (!["email", "mobile"].includes(channel)) {
    return res.status(400).json({ message: "Invalid channel" });
  }

  try {
    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    await Otp.create({
      userId: user._id,
      otp,
      channel,
      expiresAt,
    });

    if (channel === "email") {
      await sendOtpEmail(user.email, otp);
    } else {
      const phone = user.phone || "unknown";
      console.log(`[DEV MODE] Mobile OTP for ${phone}: ${otp}`);
    }

    return res.status(200).json({ success: true, channel });
  } catch (error) {
    console.error("Send OTP error:", error.message);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
};

export const verifyOtp = async (req, res) => {
  const { userId, otp } = req.body;

  if (!userId || !otp) {
    return res.status(400).json({ message: "userId and otp are required" });
  }

  try {
    const record = await Otp.findOne({
      userId,
      used: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!record || record.otp !== otp) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    record.used = true;
    await record.save();

    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Verify OTP error:", error.message);
    return res.status(500).json({ message: "Failed to verify OTP" });
  }
};

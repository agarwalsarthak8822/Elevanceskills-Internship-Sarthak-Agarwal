import mongoose from "mongoose";

const otpSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    otp: { type: String, required: true },
    channel: {
      type: String,
      enum: ["email", "mobile"],
      required: true,
    },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Otp", otpSchema);

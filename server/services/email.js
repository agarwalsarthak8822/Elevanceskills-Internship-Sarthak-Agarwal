import nodemailer from "nodemailer";

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

import twilio from "twilio";

// Twilio SMS uses the account SID + auth token (the same account SID as Twilio
// Video, but Messaging needs the auth token, not the API key pair).
const getSmsClient = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return twilio(sid, token);
};

// Sends the OTP over SMS. If Twilio isn't configured, logs the code to the
// server console so local development still works (graceful dev fallback).
export const sendOtpSms = async (to, otp) => {
  const from = process.env.TWILIO_PHONE_NUMBER;
  const client = getSmsClient();

  if (!client || !from) {
    console.log(`[DEV MODE] Mobile OTP for ${to || "unknown"}: ${otp}`);
    return { delivered: false, dev: true };
  }

  if (!to) {
    throw new Error("No phone number on file for this account");
  }

  await client.messages.create({
    to,
    from,
    body: `Your YourTube verification code is ${otp}. It expires in 5 minutes.`,
  });

  return { delivered: true };
};

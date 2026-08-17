import Razorpay from "razorpay";

export const getRazorpayCredentials = () => {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

  return { keyId, keySecret };
};

export const getRazorpayInstance = () => {
  const { keyId, keySecret } = getRazorpayCredentials();

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay credentials are not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to server/.env"
    );
  }

  if (
    keySecret.includes("your_razorpay") ||
    keySecret.includes("placeholder")
  ) {
    throw new Error(
      "Razorpay key secret is still a placeholder. Replace it with the secret from Razorpay Dashboard."
    );
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

export const logRazorpayStartupStatus = () => {
  const { keyId, keySecret } = getRazorpayCredentials();

  if (!keyId || !keySecret) {
    console.warn(
      "[Razorpay] Not configured — premium payments will fail until RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set in .env"
    );
    return;
  }

  console.log(
    `[Razorpay] Loaded key ${keyId} (secret length: ${keySecret.length})`
  );
};

import { verifyPremiumPayment } from "./paymentApi";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

interface OpenCheckoutOptions {
  user: { email?: string; name?: string };
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  plan: string;
  onSuccess: (updatedUser: any) => void;
  onError: (message: string) => void;
}

export const openRazorpayCheckout = async ({
  user,
  orderId,
  amount,
  currency,
  keyId,
  plan,
  onSuccess,
  onError,
}: OpenCheckoutOptions) => {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    onError("Failed to load Razorpay checkout");
    return;
  }

  const options = {
    key: keyId,
    amount,
    currency,
    name: "YourTube",
    description: "Premium Monthly Plan",
    order_id: orderId,
    prefill: {
      name: user.name || "",
      email: user.email || "",
    },
    theme: { color: "#dc2626" },
    handler: async (response: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }) => {
      try {
        const result = await verifyPremiumPayment({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature,
          plan,
        });
        onSuccess(result.result);
      } catch (error: any) {
        onError(
          error?.response?.data?.message || "Payment verification failed"
        );
      }
    },
    modal: {
      ondismiss: () => onError("Payment cancelled"),
    },
  };

  const razorpay = new window.Razorpay(options);
  razorpay.open();
};

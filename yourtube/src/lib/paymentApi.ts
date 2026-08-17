import axiosInstance from "./axiosinstance";

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface VerifyPaymentPayload {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  plan: string;
}

export const createPremiumOrder = async (): Promise<CreateOrderResponse> => {
  const res = await axiosInstance.post("/api/payment/create-order");
  return res.data;
};

export const verifyPremiumPayment = async (payload: VerifyPaymentPayload) => {
  const res = await axiosInstance.post("/api/payment/verify", payload);
  return res.data;
};

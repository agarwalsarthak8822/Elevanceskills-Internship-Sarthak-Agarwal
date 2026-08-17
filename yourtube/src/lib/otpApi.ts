import axios from "axios";
import { BACKEND_URL } from "./constants";

export const sendOtp = async (userId: string, channel: "email" | "mobile") => {
  const res = await axios.post(`${BACKEND_URL}/api/otp/send`, {
    userId,
    channel,
  });
  return res.data as { success: boolean; channel: "email" | "mobile" };
};

export const verifyOtp = async (userId: string, otp: string) => {
  const res = await axios.post(`${BACKEND_URL}/api/otp/verify`, {
    userId,
    otp,
  });
  return res.data as { success: boolean; user: any };
};

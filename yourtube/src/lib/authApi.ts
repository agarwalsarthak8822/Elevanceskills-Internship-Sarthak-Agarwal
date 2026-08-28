import axios from "axios";
import axiosInstance from "./axiosinstance";
import { BACKEND_URL } from "./constants";

export interface SigninResponse {
  requiresOtp: true;
  userId: string;
  email: string;
  phone: string;
}

export const signinWithPassword = async (email: string, password: string) => {
  const res = await axios.post(`${BACKEND_URL}/api/auth/signin`, {
    email,
    password,
  });
  return res.data as SigninResponse;
};

export const completeLogin = async (userId: string) => {
  const res = await axios.post(`${BACKEND_URL}/api/auth/complete-login`, {
    userId,
  });
  return res.data as { result: any; token: string };
};

// Saves the signed-in user's phone number (used for mobile OTP delivery).
// Goes through axiosInstance so the auth token (Firebase or JWT) is attached.
export const savePhone = async (phone: string) => {
  const res = await axiosInstance.patch("/user/phone", { phone });
  return res.data as { result: any };
};

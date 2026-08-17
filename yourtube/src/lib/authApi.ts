import axios from "axios";
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

import axios from "axios";
import { auth } from "./firebase";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000",
});

axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      if (typeof window !== "undefined") {
        const authToken = localStorage.getItem("authToken");
        if (authToken) {
          config.headers.Authorization = `Bearer ${authToken}`;
          return config;
        }
      }

      const currentUser = auth.currentUser;
      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${idToken}`;
      }
    } catch (error) {
      console.error("Failed to attach auth token:", error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;

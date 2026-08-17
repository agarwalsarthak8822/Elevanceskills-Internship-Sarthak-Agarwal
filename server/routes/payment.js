import express from "express";
import { createOrder, verifyPayment } from "../controllers/payment.js";
import { authenticate } from "../middleware/auth.js";

const routes = express.Router();

routes.post("/create-order", authenticate, createOrder);
routes.post("/verify", authenticate, verifyPayment);

export default routes;

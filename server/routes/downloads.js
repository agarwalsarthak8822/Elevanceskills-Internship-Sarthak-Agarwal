import express from "express";
import { getDownloadHistory } from "../controllers/download.js";
import { authenticate } from "../middleware/auth.js";

const routes = express.Router();

routes.get("/history", authenticate, getDownloadHistory);

export default routes;

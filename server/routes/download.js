import express from "express";
import { downloadVideo } from "../controllers/download.js";
import { authenticate } from "../middleware/auth.js";

const routes = express.Router();

routes.post("/:videoId", authenticate, downloadVideo);

export default routes;

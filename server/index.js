import { createServer } from "http";
import "./config/env.js";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import { Server } from "socket.io";
import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import downloadroutes from "./routes/download.js";
import downloadshistoryroutes from "./routes/downloads.js";
import paymentroutes from "./routes/payment.js";
import otproutes from "./routes/otp.js";
import apiauthroutes from "./routes/apiAuth.js";
import videocallroutes from "./routes/videoCall.js";
import { logRazorpayStartupStatus } from "./config/razorpay.js";
import { setupCallSignaling } from "./socket/callSignaling.js";

const app = express();

const corsOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://10.57.41.17:3000",
  "http://10.198.101.17:3000",
];

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Accept-Ranges", "bytes");
    next();
  },
  express.static("uploads", {
    etag: false,
    lastModified: false,
    maxAge: 0,
  })
);
app.get("/", (req, res) => {
  res.send("You tube backend is working");
});
app.use(bodyParser.json());
app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
app.use("/api/download", downloadroutes);
app.use("/api/downloads", downloadshistoryroutes);
app.use("/api/payment", paymentroutes);
app.use("/api/otp", otproutes);
app.use("/api/auth", apiauthroutes);
app.use("/api/video-call", videocallroutes);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins,
    credentials: true,
  },
});

setupCallSignaling(io);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
  logRazorpayStartupStatus();
});

const DBURL = process.env.DB_URL;

mongoose
  .connect(DBURL)
  .then(() => {
    console.log("Mongodb connected");
  })
  .catch((error) => {
    console.log(error);
  });

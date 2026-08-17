import express from "express";
import twilio from "twilio";
import { authenticate } from "../middleware/auth.js";

const routes = express.Router();

routes.post("/token", authenticate, async (req, res) => {
  const { roomName, identity } = req.body;

  if (!roomName) {
    return res.status(400).json({ message: "roomName is required" });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;

  if (!accountSid || !apiKeySid || !apiKeySecret) {
    return res.status(500).json({ message: "Twilio is not configured" });
  }

  try {
    const participantIdentity =
      identity || req.authUser._id.toString() || req.authUser.email;

    const token = new twilio.jwt.AccessToken(
      accountSid,
      apiKeySid,
      apiKeySecret,
      { identity: participantIdentity, ttl: 3600 }
    );

    token.addGrant(
      new twilio.jwt.AccessToken.VideoGrant({
        room: roomName,
      })
    );

    return res.status(200).json({
      token: token.toJwt(),
      roomName,
      identity: participantIdentity,
    });
  } catch (error) {
    console.error("Twilio token error:", error.message);
    return res.status(500).json({ message: "Failed to create call token" });
  }
});

export default routes;

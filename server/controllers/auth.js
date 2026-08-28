import mongoose from "mongoose";
import users from "../Modals/Auth.js";
import Otp from "../Modals/Otp.js";
import { verifyFirebaseIdToken, verifyEmailPassword } from "../services/firebaseAuth.js";
import { signJwt } from "../services/jwt.js";

const upsertUserFromFirebase = async (firebaseUser) => {
  let dbUser = await users.findOne({
    $or: [{ firebaseUid: firebaseUser.firebaseUid }, { email: firebaseUser.email }],
  });

  if (!dbUser) {
    dbUser = await users.create({
      firebaseUid: firebaseUser.firebaseUid,
      email: firebaseUser.email,
      name: firebaseUser.name,
      image: firebaseUser.image || "https://github.com/shadcn.png",
    });
    return { user: dbUser, isNew: true };
  }

  dbUser.firebaseUid = dbUser.firebaseUid || firebaseUser.firebaseUid;
  dbUser.name = dbUser.name || firebaseUser.name;
  dbUser.image = dbUser.image || firebaseUser.image;
  await dbUser.save();

  return { user: dbUser, isNew: false };
};

export const syncUser = async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ message: "idToken is required" });
  }

  try {
    const firebaseUser = await verifyFirebaseIdToken(idToken);
    const { user, isNew } = await upsertUserFromFirebase(firebaseUser);

    return res.status(isNew ? 201 : 200).json({ result: user });
  } catch (error) {
    console.error("Sync user error:", error.message);

    if (
      error.message?.includes("FIREBASE_API_KEY") ||
      error.message?.includes("token") ||
      error.message?.includes("INVALID") ||
      error.message?.includes("EXPIRED")
    ) {
      return res.status(401).json({
        message: error.message || "Authentication failed",
      });
    }

    return res.status(500).json({ message: "Failed to sync user account" });
  }
};

export const login = async (req, res) => {
  const { email, name, image, idToken } = req.body;

  if (idToken) {
    return syncUser(req, res);
  }

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const existingUser = await users.findOne({ email });

    if (!existingUser) {
      const newUser = await users.create({ email, name, image });
      return res.status(201).json({ result: newUser });
    }

    return res.status(200).json({ result: existingUser });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({ message: "User unavailable..." });
  }

  if (!req.authUser || req.authUser._id.toString() !== _id) {
    return res.status(403).json({ message: "Not authorized to update this profile" });
  }

  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      {
        $set: {
          channelname,
          description,
        },
      },
      { new: true }
    );

    return res.status(200).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getCurrentUser = async (req, res) => {
  return res.status(200).json({ result: req.authUser });
};

// Basic international format check: optional +, then 8-15 digits (E.164-ish).
// Twilio SMS requires a full number with country code, so we nudge toward that.
const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

export const updatePhone = async (req, res) => {
  const { phone } = req.body;

  if (!phone || !PHONE_REGEX.test(String(phone).trim())) {
    return res.status(400).json({
      message:
        "Enter a valid phone number in international format, e.g. +919876543210",
    });
  }

  try {
    const updated = await users.findByIdAndUpdate(
      req.authUser._id,
      { $set: { phone: String(phone).trim() } },
      { new: true }
    );
    return res.status(200).json({ result: updated });
  } catch (error) {
    console.error("Update phone error:", error.message);
    return res.status(500).json({ message: "Failed to save phone number" });
  }
};

export const signin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const firebaseUser = await verifyEmailPassword(email, password);
    let dbUser = await users.findOne({ email });

    if (!dbUser) {
      dbUser = await users.create({
        firebaseUid: firebaseUser.firebaseUid,
        email: firebaseUser.email,
        name: firebaseUser.name,
        image: firebaseUser.image || "https://github.com/shadcn.png",
      });
    } else if (!dbUser.firebaseUid) {
      dbUser.firebaseUid = firebaseUser.firebaseUid;
      dbUser.name = dbUser.name || firebaseUser.name;
      dbUser.image = dbUser.image || firebaseUser.image;
      await dbUser.save();
    }

    return res.status(200).json({
      requiresOtp: true,
      userId: dbUser._id,
      email: dbUser.email,
      phone: dbUser.phone || "",
    });
  } catch (error) {
    console.error("Signin error:", error.message);

    if (
      error.message?.includes("INVALID") ||
      error.message?.includes("PASSWORD") ||
      error.message?.includes("EMAIL") ||
      error.message?.includes("Invalid email")
    ) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    return res.status(500).json({ message: "Sign in failed" });
  }
};

export const completeLogin = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "userId is required" });
  }

  try {
    const recentOtp = await Otp.findOne({
      userId,
      used: true,
      updatedAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
    }).sort({ updatedAt: -1 });

    if (!recentOtp) {
      return res.status(401).json({ message: "OTP verification required" });
    }

    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const token = signJwt(user._id);

    return res.status(200).json({ result: user, token });
  } catch (error) {
    console.error("Complete login error:", error.message);
    return res.status(500).json({ message: "Failed to complete login" });
  }
};

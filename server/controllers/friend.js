import mongoose from "mongoose";
import users from "../Modals/Auth.js";

// Small, consistent projection shared by every friend response.
const PUBLIC_FIELDS = "_id name email image";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /api/friends -> current user's friends (minimal profiles)
export const listFriends = async (req, res) => {
  try {
    const me = await users
      .findById(req.authUser._id)
      .populate("friends", PUBLIC_FIELDS);

    return res.status(200).json({ friends: me?.friends ?? [] });
  } catch (error) {
    console.error("List friends error:", error.message);
    return res.status(500).json({ message: "Failed to load friends" });
  }
};

// GET /api/friends/search?q= -> other users by name/email (excludes self + existing friends)
export const searchUsers = async (req, res) => {
  const q = (req.query.q || "").toString().trim();

  if (!q) {
    return res.status(200).json({ users: [] });
  }

  try {
    const me = await users.findById(req.authUser._id).select("friends");
    const excludeIds = [req.authUser._id, ...((me?.friends ?? []))];
    const regex = new RegExp(escapeRegex(q), "i");

    const results = await users
      .find({
        _id: { $nin: excludeIds },
        $or: [{ name: regex }, { email: regex }],
      })
      .select(PUBLIC_FIELDS)
      .limit(10);

    return res.status(200).json({ users: results });
  } catch (error) {
    console.error("Search users error:", error.message);
    return res.status(500).json({ message: "Failed to search users" });
  }
};

// POST /api/friends/add { userId } -> mutual add
export const addFriend = async (req, res) => {
  const { userId } = req.body;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Valid userId is required" });
  }

  const myId = req.authUser._id.toString();

  if (userId === myId) {
    return res.status(400).json({ message: "You cannot add yourself" });
  }

  try {
    const target = await users.findById(userId).select("_id");
    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }

    // $addToSet keeps the operation idempotent (no duplicate friend entries).
    await users.findByIdAndUpdate(myId, { $addToSet: { friends: userId } });
    await users.findByIdAndUpdate(userId, { $addToSet: { friends: myId } });

    const me = await users
      .findById(myId)
      .populate("friends", PUBLIC_FIELDS);

    return res.status(200).json({ friends: me?.friends ?? [] });
  } catch (error) {
    console.error("Add friend error:", error.message);
    return res.status(500).json({ message: "Failed to add friend" });
  }
};

// DELETE /api/friends/:userId -> mutual remove
export const removeFriend = async (req, res) => {
  const { userId } = req.params;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Valid userId is required" });
  }

  const myId = req.authUser._id.toString();

  try {
    await users.findByIdAndUpdate(myId, { $pull: { friends: userId } });
    await users.findByIdAndUpdate(userId, { $pull: { friends: myId } });

    const me = await users
      .findById(myId)
      .populate("friends", PUBLIC_FIELDS);

    return res.status(200).json({ friends: me?.friends ?? [] });
  } catch (error) {
    console.error("Remove friend error:", error.message);
    return res.status(500).json({ message: "Failed to remove friend" });
  }
};

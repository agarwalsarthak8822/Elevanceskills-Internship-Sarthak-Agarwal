import mongoose from "mongoose";

const userschema = mongoose.Schema({
  firebaseUid: { type: String, unique: true, sparse: true },
  email: { type: String, required: true, unique: true },
  name: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  plan: {
    type: String,
    enum: ["free", "bronze", "silver", "gold"],
    default: "free",
  },
  phone: { type: String, default: "" },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
  planActivatedAt: { type: Date },
  joinedon: { type: Date, default: Date.now },
});

export default mongoose.model("user", userschema);

import mongoose from "mongoose";

const downloadSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
    },
    downloadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

downloadSchema.index({ userId: 1, downloadedAt: -1 });

export default mongoose.model("download", downloadSchema);

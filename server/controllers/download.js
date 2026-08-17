import path from "path";
import fs from "fs";
import Download from "../Modals/download.js";
import Video from "../Modals/video.js";
import { isFreePlan } from "../utils/plans.js";

const getStartOfUtcDay = () => {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  return start;
};

const getDownloadsToday = async (userId) => {
  const startOfDay = getStartOfUtcDay();
  return Download.countDocuments({
    userId,
    downloadedAt: { $gte: startOfDay },
  });
};

export const downloadVideo = async (req, res) => {
  const { videoId } = req.params;
  const user = req.authUser;

  try {
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    if (isFreePlan(user.plan)) {
      const downloadsToday = await getDownloadsToday(user._id);
      if (downloadsToday >= 1) {
        return res.status(403).json({ reason: "limit_reached" });
      }
    }

    const filePath = path.join(process.cwd(), video.filepath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Video file not found on server" });
    }

    await Download.create({
      userId: user._id,
      videoId: video._id,
      downloadedAt: new Date(),
    });

    const baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const normalizedPath = video.filepath.replace(/\\/g, "/");
    const downloadUrl = `${baseUrl}/${normalizedPath}`;

    return res.status(200).json({
      downloadUrl,
      filename: video.filename || `${video.videotitle}.mp4`,
      videotitle: video.videotitle,
    });
  } catch (error) {
    console.error("Download error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getDownloadHistory = async (req, res) => {
  try {
    const history = await Download.find({ userId: req.authUser._id })
      .sort({ downloadedAt: -1 })
      .populate({
        path: "videoId",
        model: "videofiles",
      });

    return res.status(200).json(history);
  } catch (error) {
    console.error("Download history error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

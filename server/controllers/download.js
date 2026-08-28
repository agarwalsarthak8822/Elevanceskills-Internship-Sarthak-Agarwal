import path from "path";
import fs from "fs";
import Download from "../Modals/download.js";
import Video from "../Modals/video.js";
import { isFreePlan } from "../utils/plans.js";

// Day boundary in IST (UTC+5:30). The app targets an Indian audience, so the
// "1 free download per day" window should reset at local midnight, not UTC.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const getStartOfIstDay = () => {
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  nowIst.setUTCHours(0, 0, 0, 0);
  return new Date(nowIst.getTime() - IST_OFFSET_MS);
};

const getDownloadsToday = async (userId) => {
  const startOfDay = getStartOfIstDay();
  return Download.countDocuments({
    userId,
    downloadedAt: { $gte: startOfDay },
  });
};

// Build a safe, human-readable filename with the right extension so the saved
// file opens correctly regardless of the stored title.
const buildDownloadName = (video, filePath) => {
  const ext = path.extname(filePath) || path.extname(video.filename || "") || ".mp4";
  const base = (video.videotitle || video.filename || "video")
    .replace(/\.[^./\\]+$/, "") // drop any existing extension in the title
    .replace(/[^\p{L}\p{N} ._-]/gu, "") // strip characters unsafe in filenames
    .trim()
    .slice(0, 80) || "video";
  return `${base}${ext}`;
};

export const downloadVideo = async (req, res) => {
  const { videoId } = req.params;
  const user = req.authUser;

  try {
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Free plan is limited to one download per (IST) day. Paid plans are
    // unlimited. The limit is enforced BEFORE we record or stream anything.
    if (isFreePlan(user.plan)) {
      const downloadsToday = await getDownloadsToday(user._id);
      if (downloadsToday >= 1) {
        return res.status(403).json({
          reason: "limit_reached",
          message:
            "Free plan allows 1 download per day. Upgrade to premium for unlimited downloads.",
        });
      }
    }

    const filePath = path.join(process.cwd(), video.filepath);
    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ message: "Video file not found on server" });
    }

    // Record the download first so a mid-stream disconnect still counts against
    // the daily quota (prevents trivially bypassing the free-tier limit).
    await Download.create({
      userId: user._id,
      videoId: video._id,
      downloadedAt: new Date(),
    });

    const downloadName = buildDownloadName(video, filePath);

    // Expose Content-Disposition so the browser (via axios) can read the
    // filename across origins, then stream the file as an attachment. This is
    // what makes the browser actually SAVE the file instead of playing it.
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    return res.download(filePath, downloadName, (err) => {
      if (err && !res.headersSent) {
        console.error("Download stream error:", err);
        res.status(500).json({ message: "Failed to stream video file" });
      }
    });
  } catch (error) {
    console.error("Download error:", error);
    if (!res.headersSent) {
      return res.status(500).json({ message: "Something went wrong" });
    }
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

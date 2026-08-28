import video from "../Modals/video.js";
import { processUpload } from "../services/media.js";

export const uploadvideo = async (req, res) => {
  if (req.file === undefined) {
    return res
      .status(404)
      .json({ message: "plz upload a mp4 video file only" });
  } else {
    try {
      // Convert the upload to a browser-playable H.264 MP4 (HEVC/10-bit phone
      // videos otherwise show a blank player) and generate a poster frame.
      // Degrades gracefully to the original file if ffmpeg isn't available.
      const { filepath } = await processUpload(req.file.path);

      const file = new video({
        videotitle: req.body.videotitle,
        filename: req.file.originalname,
        filepath,
        filetype: req.file.mimetype,
        filesize: req.file.size,
        videochanel: req.body.videochanel,
        uploader: req.body.uploader,
      });
      await file.save();
      return res.status(201).json("file uploaded successfully");
    } catch (error) {
      console.error(" error:", error);
      return res.status(500).json({ message: "Something went wrong" });
    }
  }
};
export const getallvideo = async (req, res) => {
  try {
    const files = await video.find();
    return res.status(200).send(files);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

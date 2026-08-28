"use strict";
import multer from "multer";
const storage = multer.diskStorage({
  destination: (req, res, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      new Date().toISOString().replace(/:/g, "-") + "-" + file.originalname
    );
  },
});
const filefilter = (req, file, cb) => {
  // Accept any video container/codec. Anything that isn't already a
  // browser-playable H.264 MP4 (e.g. HEVC, .mov, .webm) is converted after
  // upload by the media service, so we don't need to restrict to video/mp4 here.
  if (file.mimetype && file.mimetype.startsWith("video/")) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};
const upload = multer({ storage: storage, fileFilter: filefilter });
export default upload;

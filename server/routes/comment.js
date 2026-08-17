import express from "express";
import {
  deletecomment,
  dislikeComment,
  editcomment,
  getallcomment,
  likeComment,
  postcomment,
  translateComment,
} from "../controllers/comment.js";
import { authenticate } from "../middleware/auth.js";

const routes = express.Router();

routes.post("/translate", translateComment);
routes.post("/postcomment", authenticate, postcomment);
routes.post("/like/:commentId", authenticate, likeComment);
routes.post("/dislike/:commentId", authenticate, dislikeComment);
routes.post("/editcomment/:id", authenticate, editcomment);
routes.delete("/deletecomment/:id", authenticate, deletecomment);
routes.get("/:videoid", getallcomment);

export default routes;

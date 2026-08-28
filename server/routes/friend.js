import express from "express";
import { authenticate } from "../middleware/auth.js";
import {
  listFriends,
  searchUsers,
  addFriend,
  removeFriend,
} from "../controllers/friend.js";

const routes = express.Router();

routes.get("/", authenticate, listFriends);
routes.get("/search", authenticate, searchUsers);
routes.post("/add", authenticate, addFriend);
routes.delete("/:userId", authenticate, removeFriend);

export default routes;

import express from "express";
import { getCurrentUser, login, syncUser, updateprofile } from "../controllers/auth.js";
import { authenticate } from "../middleware/auth.js";

const routes = express.Router();

routes.post("/sync", syncUser);
routes.post("/login", login);
routes.get("/me", authenticate, getCurrentUser);
routes.patch("/update/:id", authenticate, updateprofile);

export default routes;

import express from "express";
import { signin, completeLogin } from "../controllers/auth.js";

const routes = express.Router();

routes.post("/signin", signin);
routes.post("/complete-login", completeLogin);

export default routes;

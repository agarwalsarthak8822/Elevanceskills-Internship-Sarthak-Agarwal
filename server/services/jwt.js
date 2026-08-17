import jwt from "jsonwebtoken";

const getJwtSecret = () =>
  process.env.JWT_SECRET || "yourtube-dev-jwt-secret";

export const signJwt = (userId) =>
  jwt.sign({ userId: userId.toString() }, getJwtSecret(), { expiresIn: "7d" });

export const verifyJwt = (token) => jwt.verify(token, getJwtSecret());

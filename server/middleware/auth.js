import users from "../Modals/Auth.js";
import { verifyFirebaseIdToken } from "../services/firebaseAuth.js";
import { verifyJwt } from "../services/jwt.js";

const isLikelyJwt = (token) => token.split(".").length === 3;

const authenticateWithJwt = async (token) => {
  const payload = verifyJwt(token);
  const dbUser = await users.findById(payload.userId);

  if (!dbUser) {
    throw new Error("User not found for token");
  }

  return dbUser;
};

const authenticateWithFirebase = async (token) => {
  const firebaseUser = await verifyFirebaseIdToken(token);

  let dbUser = await users.findOne({
    $or: [{ firebaseUid: firebaseUser.firebaseUid }, { email: firebaseUser.email }],
  });

  if (!dbUser) {
    dbUser = await users.create({
      firebaseUid: firebaseUser.firebaseUid,
      email: firebaseUser.email,
      name: firebaseUser.name,
      image: firebaseUser.image || "https://github.com/shadcn.png",
    });
  } else if (!dbUser.firebaseUid) {
    dbUser.firebaseUid = firebaseUser.firebaseUid;
    dbUser.name = dbUser.name || firebaseUser.name;
    dbUser.image = dbUser.image || firebaseUser.image;
    await dbUser.save();
  }

  return dbUser;
};

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    req.authUser = isLikelyJwt(token)
      ? await authenticateWithJwt(token)
      : await authenticateWithFirebase(token);

    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return next();
    }

    req.authUser = isLikelyJwt(token)
      ? await authenticateWithJwt(token)
      : await authenticateWithFirebase(token);
  } catch (error) {
    console.error("Optional auth error:", error.message);
  }

  next();
};

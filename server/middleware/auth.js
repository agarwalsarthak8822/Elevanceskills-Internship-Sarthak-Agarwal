import users from "../Modals/Auth.js";
import { verifyFirebaseIdToken } from "../services/firebaseAuth.js";
import { verifyJwt } from "../services/jwt.js";

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

// Both our own JWTs and Firebase ID tokens are 3-segment JWTs, so token shape
// alone can't tell them apart. Our JWTs are HMAC (HS256) and verify locally;
// Firebase ID tokens are RS256 and throw "invalid algorithm" if run through
// verifyJwt. So try our own JWT first (fast, local) and fall back to Firebase —
// the same strategy the socket handshake auth in index.js uses.
const resolveUserFromToken = async (token) => {
  try {
    return await authenticateWithJwt(token);
  } catch {
    return await authenticateWithFirebase(token);
  }
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

    req.authUser = await resolveUserFromToken(token);

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

    req.authUser = await resolveUserFromToken(token);
  } catch (error) {
    console.error("Optional auth error:", error.message);
  }

  next();
};

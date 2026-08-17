const getFirebaseApiKey = () =>
  process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export const verifyEmailPassword = async (email, password) => {
  const apiKey = getFirebaseApiKey();

  if (!apiKey) {
    throw new Error("FIREBASE_API_KEY is not configured on the server");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.error?.message || "Invalid email or password";
    throw new Error(message);
  }

  return {
    firebaseUid: data.localId,
    email: data.email,
    name: data.displayName || data.email?.split("@")[0] || "User",
    image: data.photoUrl || "",
    idToken: data.idToken,
  };
};

export const verifyFirebaseIdToken = async (idToken) => {
  const apiKey = getFirebaseApiKey();

  if (!apiKey) {
    throw new Error("FIREBASE_API_KEY is not configured on the server");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.error?.message || "Invalid or expired authentication token";
    throw new Error(message);
  }

  const user = data.users?.[0];
  if (!user) {
    throw new Error("User not found for provided token");
  }

  return {
    firebaseUid: user.localId,
    email: user.email,
    name: user.displayName || user.email?.split("@")[0] || "User",
    image: user.photoUrl || "",
    emailVerified: user.emailVerified,
  };
};

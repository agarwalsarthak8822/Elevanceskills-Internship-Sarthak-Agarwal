import { io, Socket } from "socket.io-client";
import { BACKEND_URL } from "./constants";
import { auth } from "./firebase";

let socket: Socket | null = null;

/**
 * Resolve the same bearer token axiosInstance uses:
 *   1. our own signed JWT from localStorage ("authToken"), else
 *   2. the current Firebase user's id token (async).
 * Returns an empty string when unauthenticated so the server can reject the
 * handshake cleanly.
 */
async function resolveToken(): Promise<string> {
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("authToken");
      if (stored) return stored;
    }

    const currentUser = auth.currentUser;
    if (currentUser) {
      return await currentUser.getIdToken();
    }
  } catch (error) {
    console.error("Failed to resolve socket auth token:", error);
  }

  return "";
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(BACKEND_URL, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      withCredentials: true,
      // socket.io calls this before every (re)connection attempt and supports
      // async resolution via the callback — perfect for Firebase's async token
      // and for refreshing the token on reconnect.
      auth: (cb: (data: { token: string }) => void) => {
        resolveToken().then((token) => cb({ token }));
      },
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const instance = getSocket();
  if (!instance.connected) {
    instance.connect();
  }
  return instance;
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export function registerSocketUser(userId?: string) {
  const instance = connectSocket();
  // Identity is derived server-side from the verified handshake token; the
  // payload is sent only for backward compatibility and is ignored by server.
  instance.emit("register", userId ? { userId } : {});
  return instance;
}

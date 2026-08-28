// userId -> socketId for every connected (authenticated) client.
const onlineUsers = new Map();
// userIds that are currently in an active call (used for busy handling).
const busyUsers = new Set();

export function setupCallSignaling(io) {
  const broadcastOnlineUsers = () => {
    io.emit("online-users", Array.from(onlineUsers.keys()));
  };

  const markPresent = (socket) => {
    const userId = socket.data.userId;
    if (!userId) return;
    socket.userId = userId;
    onlineUsers.set(userId, socket.id);
    socket.join(`user:${userId}`);
    broadcastOnlineUsers();
  };

  io.on("connection", (socket) => {
    // Identity is established by the io.use() handshake auth in index.js, so
    // presence is bound to the verified id — not to anything the client sends.
    markPresent(socket);

    // Kept for API compatibility with the client; identity is still the
    // verified handshake id, never the payload.
    socket.on("register", () => {
      markPresent(socket);
    });

    socket.on("get-online-users", () => {
      socket.emit("online-users", Array.from(onlineUsers.keys()));
    });

    socket.on("call-user", ({ callerName, calleeId, roomName }) => {
      const callerId = socket.data.userId;

      if (!callerId || !calleeId || !roomName) {
        socket.emit("call-error", { message: "Invalid call request" });
        return;
      }

      if (calleeId === callerId) {
        socket.emit("call-error", { message: "You cannot call yourself" });
        return;
      }

      const calleeSocketId = onlineUsers.get(calleeId);

      if (!calleeSocketId) {
        socket.emit("call-unavailable", {
          message: "User is offline or unavailable",
        });
        return;
      }

      if (busyUsers.has(calleeId)) {
        socket.emit("call-unavailable", {
          message: "User is on another call",
        });
        return;
      }

      io.to(calleeSocketId).emit("incoming-call", {
        callerId,
        callerName: callerName || "Unknown caller",
        roomName,
      });
    });

    socket.on("accept-call", ({ callerId, roomName }) => {
      const calleeId = socket.data.userId;
      const callerSocketId = onlineUsers.get(callerId);

      // Both parties are now committed to the call.
      if (calleeId) busyUsers.add(calleeId);
      if (callerId) busyUsers.add(callerId);

      if (callerSocketId) {
        io.to(callerSocketId).emit("call-accepted", {
          calleeId,
          roomName,
        });
      }
    });

    socket.on("reject-call", ({ callerId }) => {
      const callerSocketId = onlineUsers.get(callerId);

      if (callerSocketId) {
        io.to(callerSocketId).emit("call-rejected");
      }
    });

    // Caller gave up before the callee answered (manual hang-up or ring
    // timeout) — tell the callee to dismiss the incoming-call UI.
    socket.on("cancel-call", ({ calleeId }) => {
      const calleeSocketId = onlineUsers.get(calleeId);

      if (calleeSocketId) {
        io.to(calleeSocketId).emit("call-canceled");
      }
    });

    socket.on("end-call", ({ peerId }) => {
      const selfId = socket.data.userId;
      if (selfId) busyUsers.delete(selfId);
      if (peerId) busyUsers.delete(peerId);

      const peerSocketId = onlineUsers.get(peerId);

      if (peerSocketId) {
        io.to(peerSocketId).emit("call-ended");
      }
    });

    socket.on("disconnect", () => {
      const userId = socket.data.userId || socket.userId;
      if (userId) {
        // Only clear presence if this socket is still the registered one for
        // the user (guards against a stale disconnect after a reconnect).
        if (onlineUsers.get(userId) === socket.id) {
          onlineUsers.delete(userId);
        }
        busyUsers.delete(userId);
        broadcastOnlineUsers();
      }
    });
  });
}

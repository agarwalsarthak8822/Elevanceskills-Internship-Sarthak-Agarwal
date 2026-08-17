const onlineUsers = new Map();

export function setupCallSignaling(io) {
  io.on("connection", (socket) => {
    socket.on("register", ({ userId }) => {
      if (!userId) return;

      socket.userId = userId;
      onlineUsers.set(userId, socket.id);
      socket.join(`user:${userId}`);
    });

    socket.on("call-user", ({ callerId, callerName, calleeId, roomName }) => {
      if (!callerId || !calleeId || !roomName) {
        socket.emit("call-error", { message: "Invalid call request" });
        return;
      }

      const calleeSocketId = onlineUsers.get(calleeId);

      if (!calleeSocketId) {
        socket.emit("call-unavailable", {
          message: "User is offline or unavailable",
        });
        return;
      }

      io.to(calleeSocketId).emit("incoming-call", {
        callerId,
        callerName: callerName || "Unknown caller",
        roomName,
      });
    });

    socket.on("accept-call", ({ callerId, calleeId, roomName }) => {
      const callerSocketId = onlineUsers.get(callerId);

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

    socket.on("end-call", ({ peerId }) => {
      const peerSocketId = onlineUsers.get(peerId);

      if (peerSocketId) {
        io.to(peerSocketId).emit("call-ended");
      }
    });

    socket.on("disconnect", () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
      }
    });
  });
}

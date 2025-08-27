const io = require("socket.io")(process.env.PORT || 8000, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["polling", "websocket"], // Polling first for Render compatibility
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  // Render-specific optimizations
  maxHttpBufferSize: 1e6,
  allowRequest: (req, callback) => {
    // Allow all requests for now
    callback(null, true);
  },
  // Better error handling
  connectTimeout: 45000,
  // Force polling on initial connection
  upgrade: true,
  rememberUpgrade: false,
});

console.log("Socket.IO server starting on port", process.env.PORT || 8000);

// Add HTTP health check endpoint
const http = require("http");
const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "healthy",
        timestamp: new Date().toISOString(),
        activeUsers: activeUsers.length,
        activeCalls: activeCalls.length,
        uptime: process.uptime(),
      })
    );
  } else {
    res.writeHead(404);
    res.end("Not Found");
  }
});

// Attach Socket.IO to the HTTP server
io.attach(server);

// Start the server
server.listen(process.env.PORT || 8000, () => {
  console.log(
    `🚀 HTTP server with Socket.IO running on port ${process.env.PORT || 8000}`
  );
  console.log(
    `🔍 Health check available at: http://localhost:${
      process.env.PORT || 8000
    }/health`
  );
});

// Track active users and their socket IDs
const activeUsers = [];
const activeCalls = [];

// Helper function to find a user
const getUser = (userId) => {
  return activeUsers.find((user) => user.userId === userId);
};

io.on("connection", (socket) => {
  console.log(
    "User connected:",
    socket.id,
    "Transport:",
    socket.conn.transport.name
  );

  // Handle user registration
  socket.on("addUser", (userData) => {
    const { userId, name, email, avatar } = userData;

    // Remove existing user entry if exists
    const existingUserIndex = activeUsers.findIndex(
      (user) => user.userId === userId
    );
    if (existingUserIndex !== -1) {
      activeUsers.splice(existingUserIndex, 1);
    }

    // Add new user entry
    activeUsers.push({
      userId,
      name,
      email,
      avatar,
      socketId: socket.id,
    });

    console.log("User added:", { userId, name, socketId: socket.id });
    console.log("Active users:", activeUsers.length);
  });

  // Handle call initiation
  socket.on("initiateCall", (data) => {
    const { receiverId, callType, callerName, callerAvatar } = data;
    const callerId = socket.id;

    console.log("Call initiated:", { callerId, receiverId, callType });

    // Find receiver in active users
    const receiver = getUser(receiverId);
    if (!receiver) {
      console.log("Receiver not found:", receiverId);
      socket.emit("callFailed", { reason: "Receiver not online" });
      return;
    }

    // Store call data
    const callId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    activeCalls.push({
      callId,
      callerId,
      receiverId,
      callType,
      status: "ringing",
      startTime: Date.now(),
    });

    console.log("Call stored:", { callId, status: "ringing" });

    // Emit incoming call to receiver
    socket.to(receiver.socketId).emit("incomingCall", {
      callId,
      callerId,
      receiverId,
      callType,
      callerName,
      callerAvatar,
      status: "ringing",
    });

    console.log("Incoming call sent to receiver:", receiver.socketId);
  });

  // Handle call acceptance
  socket.on("acceptCall", (data) => {
    const { callerId, receiverId, callType } = data;

    console.log("Call accepted:", { callerId, receiverId, callType });

    // Find the call
    const callIndex = activeCalls.findIndex(
      (call) =>
        call.callerId === callerId &&
        call.receiverId === receiverId &&
        call.status === "ringing"
    );

    if (callIndex !== -1) {
      // Update call status
      activeCalls[callIndex].status = "active";
      activeCalls[callIndex].startTime = Date.now();

      // Emit call accepted to caller
      socket.emit("callAccepted", {
        callerId,
        receiverId,
        callType,
        receiverSocketId: socket.id,
        callId: activeCalls[callIndex].callId,
      });

      console.log("Call accepted event sent to caller");
    }
  });

  // Handle call decline
  socket.on("declineCall", (data) => {
    const { callerId, receiverId, callType } = data;

    console.log("Call declined:", { callerId, receiverId, callType });

    // Remove call from active calls
    const callIndex = activeCalls.findIndex(
      (call) =>
        call.callerId === callerId &&
        call.receiverId === receiverId &&
        call.status === "ringing"
    );

    if (callIndex !== -1) {
      activeCalls.splice(callIndex, 1);
      console.log("Call removed from active calls");
    }
  });

  // Handle call end
  socket.on("endCall", (data) => {
    const { callerId, receiverId, callType } = data;

    console.log("Call ended:", { callerId, receiverId, callType });

    // Remove call from active calls
    const callIndex = activeCalls.findIndex(
      (call) => call.callerId === callerId && call.receiverId === receiverId
    );

    if (callIndex !== -1) {
      activeCalls.splice(callIndex, 1);
      console.log("Call removed from active calls");
    }
  });

  // Forward WebRTC signaling messages
  socket.on("offer", (data) => {
    const { receiverId, offer } = data;
    const receiver = getUser(receiverId);

    if (receiver) {
      socket.to(receiver.socketId).emit("offer", {
        ...data,
        senderId: socket.id,
      });
      console.log("Offer forwarded to receiver");
    }
  });

  socket.on("answer", (data) => {
    const { receiverId, answer } = data;
    const receiver = getUser(receiverId);

    if (receiver) {
      socket.to(receiver.socketId).emit("answer", {
        ...data,
        senderId: socket.id,
      });
      console.log("Answer forwarded to caller");
    }
  });

  socket.on("iceCandidate", (data) => {
    const { receiverId, candidate } = data;
    const receiver = getUser(receiverId);

    if (receiver) {
      socket.to(receiver.socketId).emit("iceCandidate", {
        ...data,
        senderId: socket.id,
      });
      console.log("ICE candidate forwarded");
    }
  });

  // Debug endpoint
  socket.on("debug", (data) => {
    console.log("Debug request received:", data);
    socket.emit("debug", {
      activeUsers,
      activeCalls,
      timestamp: new Date().toISOString(),
    });
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    // Remove user from active users
    const userIndex = activeUsers.findIndex(
      (user) => user.socketId === socket.id
    );
    if (userIndex !== -1) {
      activeUsers.splice(userIndex, 1);
      console.log("User removed from active users");
    }

    // Remove any calls involving this user
    const callsToRemove = activeCalls.filter(
      (call) => call.callerId === socket.id || call.receiverId === socket.id
    );
    callsToRemove.forEach((call) => {
      const callIndex = activeCalls.indexOf(call);
      if (callIndex !== -1) {
        activeCalls.splice(callIndex, 1);
      }
    });

    if (callsToRemove.length > 0) {
      console.log(
        "Calls removed due to user disconnect:",
        callsToRemove.length
      );
    }
  });
});

// Error handling for the server
io.engine.on("connection_error", (err) => {
  console.error("Connection error:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

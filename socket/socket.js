const io = require("socket.io")(8000, {
  cors: {
    origin: "*", // Allow all origins for development
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Log server startup
console.log("🚀 Socket.IO server starting on port 8000");

// Global variables for tracking users and calls
let activeUsers = [];
let activeCalls = new Map(); // Track active calls

// Helper functions
const getUser = (userId) => {
  return activeUsers.find((user) => user.userId === userId);
};

const getActiveCall = (userId) => {
  return activeCalls.get(userId);
};

io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  // Add user to socket
  socket.on("addUser", (userId, user) => {
    console.log("🔄 Adding user:", userId, "Socket:", socket.id);

    // Check if user already exists
    const existingUserIndex = activeUsers.findIndex((u) => u.userId === userId);

    if (existingUserIndex === -1) {
      // New user
      activeUsers.push({
        userId,
        socketId: socket.id,
        authUser: user,
      });
      console.log("✅ New user added to active users");
    } else {
      // Update existing user's socket ID
      activeUsers[existingUserIndex].socketId = socket.id;
      console.log("✅ Existing user socket ID updated");
    }

    console.log("📊 Active users:", activeUsers.length);

    // Emit updated users list to all clients
    io.emit("getUsers", activeUsers);

    // Also emit confirmation to the specific user
    socket.emit("userAdded", {
      userId,
      socketId: socket.id,
      message: "User successfully added to socket server",
      activeUsersCount: activeUsers.length,
    });
  });

  // Handle sending messages
  socket.on("sendMessage", (data) => {
    console.log("📨 Message received:", data);
    const receiver = getUser(data.receiverId);

    if (receiver) {
      console.log("📤 Sending message to:", data.receiverId);
      io.to(receiver.socketId).emit("getMessage", data);
    } else {
      console.log("❌ Receiver not found:", data.receiverId);
    }
  });

  // Handle typing indicators
  socket.on("typing", (data) => {
    const receiver = getUser(data.receiverId);
    if (receiver) {
      io.to(receiver.socketId).emit("userTyping", data);
    }
  });

  socket.on("stopTyping", (data) => {
    const receiver = getUser(data.receiverId);
    if (receiver) {
      io.to(receiver.socketId).emit("userStopTyping", data);
    }
  });

  // Handle call initiation
  socket.on("initiateCall", (data) => {
    console.log("📞 Call initiated:", data);
    const receiver = getUser(data.receiverId);

    if (receiver) {
      // Check if user is already in a call
      if (getActiveCall(data.receiverId)) {
        socket.emit("callFailed", {
          reason: "User is busy in another call",
          receiverId: data.receiverId,
        });
        return;
      }

      // Store call data
      const callData = {
        callId:
          data.callId || `${data.callerId}-${data.receiverId}-${Date.now()}`,
        callerId: data.callerId,
        receiverId: data.receiverId,
        callType: data.callType,
        status: "ringing",
        startTime: Date.now(),
      };

      activeCalls.set(data.callerId, callData);
      activeCalls.set(data.receiverId, callData);

      // Emit incoming call to receiver
      io.to(receiver.socketId).emit("incomingCall", {
        ...callData,
        callerName: data.callerName || "Caller",
        callerAvatar: data.callerAvatar || "/profile.jpg",
      });

      console.log("✅ Incoming call sent to:", data.receiverId);
    } else {
      socket.emit("callFailed", {
        reason: "Receiver not found",
        receiverId: data.receiverId,
      });
    }
  });

  // Handle call acceptance
  socket.on("acceptCall", (data) => {
    console.log("📞 ACCEPT CALL RECEIVED:", data);
    console.log("📞 Socket ID:", socket.id);
    console.log("📞 Active users:", activeUsers.length);
    console.log(
      "📞 Active users details:",
      activeUsers.map((u) => ({ userId: u.userId, socketId: u.socketId }))
    );

    const caller = getUser(data.callerId);
    const receiver = getUser(data.receiverId);

    console.log("📞 Caller found:", caller ? "YES" : "NO", caller?.userId);
    console.log(
      "📞 Receiver found:",
      receiver ? "YES" : "NO",
      receiver?.userId
    );

    if (caller && receiver) {
      let callData =
        getActiveCall(data.callerId) || getActiveCall(data.receiverId);

      console.log("📞 Call data found:", callData ? "YES" : "NO");

      if (callData) {
        callData.status = "active";
        callData.answerTime = Date.now();

        console.log("✅ Call status updated to active");

        // Notify caller that call was accepted - this should trigger them to send the WebRTC offer
        console.log("📡 Emitting callAccepted to caller:", {
          callerSocketId: caller.socketId,
          callerUserId: caller.userId,
          event: "callAccepted",
        });

        // CRITICAL: Use specific socket emission, NOT broadcasting
        const callerSocket = io.sockets.sockets.get(caller.socketId);
        if (callerSocket) {
          callerSocket.emit("callAccepted", {
            ...data,
            receiverSocketId: receiver.socketId,
            callId: callData.callId,
          });
          console.log("✅ callAccepted sent to specific caller socket");
        } else {
          console.log(
            "❌ ERROR: Caller socket not found for ID:",
            caller.socketId
          );
        }

        // Notify receiver that call is now active - they should wait for the WebRTC offer
        console.log("📡 Emitting callConnected to receiver:", {
          receiverSocketId: receiver.socketId,
          receiverUserId: receiver.userId,
          event: "callConnected",
        });

        // CRITICAL: Use specific socket emission, NOT broadcasting
        const receiverSocket = io.sockets.sockets.get(receiver.socketId);
        if (receiverSocket) {
          receiverSocket.emit("callConnected", {
            ...callData,
            callerSocketId: caller.socketId,
          });
          console.log("✅ callConnected sent to specific receiver socket");
        } else {
          console.log(
            "❌ ERROR: Receiver socket not found for ID:",
            receiver.socketId
          );
        }

        console.log("✅ Call accepted and connected successfully");
        console.log("🔄 Caller should now send WebRTC offer to receiver");

        console.log("✅ Call accepted and connected successfully");
      } else {
        console.log("❌ No call data found, creating new call data");
        // Create a new call data if none exists
        const newCallData = {
          callId: `${data.callerId}-${data.receiverId}-${Date.now()}`,
          callerId: data.callerId,
          receiverId: data.receiverId,
          callType: data.callType,
          status: "active",
          startTime: Date.now(),
          answerTime: Date.now(),
        };

        activeCalls.set(data.callerId, newCallData);
        activeCalls.set(data.receiverId, newCallData);

        console.log("✅ New call data created:", newCallData);

        // Notify both parties
        const callerSocket = io.sockets.sockets.get(caller.socketId);
        if (callerSocket) {
          callerSocket.emit("callAccepted", {
            ...data,
            receiverSocketId: receiver.socketId,
            callId: newCallData.callId,
          });
          console.log(
            "✅ callAccepted sent to specific caller socket (new call)"
          );
        } else {
          console.log(
            "❌ ERROR: Caller socket not found for ID (new call):",
            caller.socketId
          );
        }

        const receiverSocket = io.sockets.sockets.get(receiver.socketId);
        if (receiverSocket) {
          receiverSocket.emit("callConnected", {
            ...newCallData,
            callerSocketId: caller.socketId,
          });
          console.log(
            "✅ callConnected sent to specific receiver socket (new call)"
          );
        } else {
          console.log(
            "❌ ERROR: Receiver socket not found for ID (new call):",
            receiver.socketId
          );
        }
      }
    } else {
      if (!caller) {
        console.log("❌ Caller not found:", data.callerId);
        console.log(
          "❌ Available users:",
          activeUsers.map((u) => u.userId)
        );
      }
      if (!receiver) {
        console.log("❌ Receiver not found:", data.receiverId);
        console.log(
          "❌ Available users:",
          activeUsers.map((u) => u.userId)
        );
      }
      console.log("❌ Cannot accept call - users not found in active users");
    }
  });

  // Handle call type change (e.g., video -> audio fallback)
  socket.on("callTypeChanged", (data) => {
    console.log("🔄 SOCKET SERVER: Received callTypeChanged event");
    console.log("🔄 Event data:", data);
    console.log("🔄 Socket ID:", socket.id);
    console.log("🔄 Looking for caller with ID:", data.callerId);
    console.log(
      "🔄 Available users:",
      activeUsers.map((u) => ({ userId: u.userId, socketId: u.socketId }))
    );

    // Find the caller to notify them about the call type change
    const caller = getUser(data.callerId);

    if (caller) {
      // Forward the call type change to the caller
      io.to(caller.socketId).emit("callTypeChanged", {
        callId: data.callId,
        newCallType: data.newCallType,
        reason: data.reason,
      });
      console.log(
        `🔄 Call type change forwarded to caller: ${data.newCallType}`
      );
      console.log(`🔄 Caller socket ID: ${caller.socketId}`);
    } else {
      console.log("❌ Caller not found for call type change:", data.callerId);
      console.log(
        "❌ Available user IDs:",
        activeUsers.map((u) => u.userId)
      );
    }
  });

  // Handle call decline
  socket.on("declineCall", (data) => {
    console.log("❌ Call declined:", data);
    const caller = getUser(data.callerId);

    if (caller) {
      // Clean up call data
      activeCalls.delete(data.callerId);
      activeCalls.delete(data.receiverId);

      io.to(caller.socketId).emit("callDeclined", {
        ...data,
        receiverSocketId: socket.id,
      });
    }
  });

  // Handle call ending
  socket.on("endCall", (data) => {
    console.log("🔚 Call ended:", data);
    const caller = getUser(data.callerId);
    const receiver = getUser(data.receiverId);

    if (caller && receiver) {
      // Clean up call data
      activeCalls.delete(data.callerId);
      activeCalls.delete(data.receiverId);

      // Find the other party
      const currentUser = activeUsers.find((u) => u.socketId === socket.id);
      const currentUserId = currentUser ? currentUser.userId : null;

      if (currentUserId) {
        const otherUser = currentUserId === data.callerId ? receiver : caller;
        if (otherUser) {
          io.to(otherUser.socketId).emit("callEnded", {
            ...data,
            enderSocketId: socket.id,
            enderId: currentUserId,
            reason: "Call ended by other party",
          });
        }
      }
    }
  });

  // Handle WebRTC signaling with enhanced cross-device support
  socket.on("offer", (data) => {
    console.log("🎯 SOCKET SERVER: Received offer:", {
      receiverId: data.receiverId,
      hasOffer: !!data.offer,
      offerType: data.offer?.type,
      callId: data.callId,
    });

    const receiver = getUser(data.receiverId);
    if (receiver) {
      // Find the sender's user ID from active users
      const sender = activeUsers.find((u) => u.socketId === socket.id);
      const senderId = sender ? sender.userId : null;

      console.log("🎯 SOCKET SERVER: Forwarding offer to receiver:", {
        receiverSocketId: receiver.socketId,
        senderId: senderId,
        callId: data.callId,
      });

      // Forward the offer with enhanced metadata for cross-device calls
      io.to(receiver.socketId).emit("offer", {
        ...data,
        senderId: senderId,
        timestamp: Date.now(),
        isCrossDevice: true, // Flag for cross-device handling
      });

      console.log("✅ SOCKET SERVER: Offer forwarded successfully");
    } else {
      console.log(
        "❌ SOCKET SERVER: Receiver not found for offer:",
        data.receiverId
      );
      console.log(
        "❌ SOCKET SERVER: Available users:",
        activeUsers.map((u) => ({ userId: u.userId, socketId: u.socketId }))
      );
    }
  });

  socket.on("answer", (data) => {
    console.log("🎯 SOCKET SERVER: Received answer:", {
      receiverId: data.receiverId,
      hasAnswer: !!data.answer,
      answerType: data.answer?.type,
      callId: data.callId,
    });

    const receiver = getUser(data.receiverId);
    if (receiver) {
      // Find the sender's user ID from active users
      const sender = activeUsers.find((u) => u.socketId === socket.id);
      const senderId = sender ? sender.userId : null;

      console.log("🎯 SOCKET SERVER: Forwarding answer to receiver:", {
        receiverSocketId: receiver.socketId,
        senderId: senderId,
        callId: data.callId,
      });

      // Forward the answer with enhanced metadata
      io.to(receiver.socketId).emit("answer", {
        ...data,
        senderId: senderId,
        timestamp: Date.now(),
        isCrossDevice: true,
      });

      console.log("✅ SOCKET SERVER: Answer forwarded successfully");
    } else {
      console.log(
        "❌ SOCKET SERVER: Receiver not found for answer:",
        data.receiverId
      );
    }
  });

  socket.on("iceCandidate", (data) => {
    console.log("🧊 SOCKET SERVER: Received ICE candidate:", {
      receiverId: data.receiverId,
      hasCandidate: !!data.candidate,
      candidateType: data.candidate?.type,
      callId: data.callId,
    });

    const receiver = getUser(data.receiverId);
    if (receiver) {
      // Find the sender's user ID from active users
      const sender = activeUsers.find((u) => u.socketId === socket.id);
      const senderId = sender ? sender.userId : null;

      console.log("🧊 SOCKET SERVER: Forwarding ICE candidate to receiver:", {
        receiverSocketId: receiver.socketId,
        senderId: senderId,
        callId: data.callId,
      });

      // Forward the ICE candidate with enhanced metadata
      io.to(receiver.socketId).emit("iceCandidate", {
        ...data,
        senderId: senderId,
        timestamp: Date.now(),
        isCrossDevice: true,
      });

      console.log("✅ SOCKET SERVER: ICE candidate forwarded successfully");
    } else {
      console.log(
        "❌ SOCKET SERVER: Receiver not found for ICE candidate:",
        data.receiverId
      );
    }
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    console.log("🔌 Socket disconnected:", socket.id);

    // Clean up any active calls for this user
    const userId = activeUsers.find((u) => u.socketId === socket.id)?.userId;

    if (userId) {
      const callData = getActiveCall(userId);
      if (callData) {
        // Notify other user that call ended due to disconnection
        const otherUserId =
          callData.callerId === userId
            ? callData.receiverId
            : callData.callerId;
        const otherUser = getUser(otherUserId);
        if (otherUser) {
          io.to(otherUser.socketId).emit("callEnded", {
            reason: "User disconnected",
            otherUserId: userId,
            enderId: userId,
            callType: callData.callType,
          });
        }

        // Clean up call data
        activeCalls.delete(callData.callerId);
        activeCalls.delete(callData.receiverId);
      }
    }

    // Remove user from active users
    activeUsers = activeUsers.filter((user) => user.socketId !== socket.id);
    io.emit("getUsers", activeUsers);

    console.log("📊 Active users after disconnect:", activeUsers.length);
  });
});

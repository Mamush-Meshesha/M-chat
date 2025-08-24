/* eslint-disable @typescript-eslint/no-explicit-any */
import { FC, useEffect, useRef, useState } from "react";
import Dashboardheader from "../components/ui/dashboardheader";
import Dashboardbottom from "../components/ui/dashboardbottom";
import Header from "../components/header";
import Notification from "../components/ui/notification";
import CallDialog from "../components/ui/callDialog";
import { FaCheck } from "react-icons/fa6";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store";
import { Socket } from "socket.io-client";
import {
  addMessage,
  setTypingUser,
  removeTypingUser,
  addUnreadMessage,
  markMessagesAsRead,
  setCurrentUser,
} from "../slice/userSlice";
import callingService from "../services/callingService";
import socketManager from "../services/socketManager";

interface HomeProps {}

interface NotificationData {
  id: string;
  message: string;
  senderName: string;
}

interface CallData {
  callerId: string;
  callerName: string;
  callType: "audio" | "video";
  callerAvatar?: string;
  callId?: string;
  receiverId?: string;
  status?: string;
}

const Home: FC<HomeProps> = () => {
  const dispatch = useDispatch();
  const currentUserChat = useSelector(
    (state: RootState) => state.user.currentUser
  );
  const recConversation = useSelector(
    (state: RootState) => state.user.recConversation
  );
  const typingUsers = useSelector((state: RootState) => state.user.typingUsers);
  const unreadCounts = useSelector(
    (state: RootState) => state.user.unreadCounts
  );
  const authUser = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeUser, setActiveUser] = useState([]);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState("chat"); // Mobile navigation state
  const socket = useRef<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    const initializeSocket = async () => {
      try {
        console.log("🔐 Home: initializeSocket called");
        console.log("🔐 Home: isAuthenticated:", isAuthenticated);
        console.log("🔐 Home: authUser:", authUser);
        console.log("🔐 Home: authUser._id:", authUser?._id);

        // Only create socket if user is authenticated
        if (!isAuthenticated || !authUser?._id) {
          console.log(
            "❌ Home: User not authenticated, skipping socket initialization"
          );
          return;
        }

        console.log(
          "✅ Home: User is authenticated, proceeding with socket initialization"
        );

        // Add a small delay to ensure authentication state is fully restored
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Check if we need to create a new socket or reconnect existing one
        if (!socket.current || !socket.current.connected) {
          console.log("🔄 Home: Creating new socket connection...");
          socket.current = await socketManager.createSocket();

          // Setup socket event listeners
          socket.current.on("connect", () => {
            console.log(
              "✅ Home: Socket connected with ID:",
              socket.current?.id
            );
            // Add user immediately after connection
            if (authUser?._id) {
              console.log("🔄 Home: Adding user to socket:", authUser._id);
              console.log("🔄 Home: User data being sent:", authUser);
              socket.current?.emit("addUser", authUser._id, authUser);
            } else {
              console.log(
                "❌ Home: No authUser._id available when socket connected"
              );
            }
          });

          socket.current.on("disconnect", (reason) => {
            console.log("❌ Socket disconnected, reason:", reason);
            // Try to reconnect after a delay
            setTimeout(() => {
              if (authUser?._id && isAuthenticated) {
                console.log("🔄 Attempting to reconnect socket...");
                initializeSocket();
              }
            }, 2000);
          });

          socket.current.on("connect_error", (error) => {
            console.error("Socket connection error:", error);
            // Try to reconnect after error
            setTimeout(() => {
              if (authUser?._id && isAuthenticated) {
                console.log("🔄 Attempting to reconnect after error...");
                initializeSocket();
              }
            }, 3000);
          });

          socket.current.on("reconnect", (attemptNumber) => {
            console.log(
              "✅ Socket reconnected after",
              attemptNumber,
              "attempts"
            );
            // Re-add user after reconnection
            if (authUser?._id) {
              console.log(
                "🔄 Re-adding user after reconnection:",
                authUser._id
              );
              socket.current?.emit("addUser", authUser._id, authUser);
            }
          });

          // Listen for users
          socket.current.on("getUsers", (users) => {
            if (authUser?._id) {
              const filteredUser = users.filter(
                (user: any) => user.userId !== authUser._id
              );
              setActiveUser(filteredUser);
            }
          });

          // Listen for messages
          socket.current.on("getMessage", (data) => {
            console.log("Message received:", data);
            dispatch(addMessage(data));
            if (data.receiverId) {
              dispatch(addUnreadMessage(data.receiverId));
            }
          });

          // Listen for typing indicators
          socket.current.on("userTyping", (data) => {
            if (data.receiverId === authUser?._id) {
              dispatch(setTypingUser(data.senderId));
            }
          });

          socket.current.on("userStopTyping", (data) => {
            if (data.receiverId === authUser?._id) {
              dispatch(removeTypingUser(data.senderId));
            }
          });

          // Listen for incoming calls
          socket.current.on("incomingCall", (data) => {
            console.log("Incoming call received:", data);
            if (authUser?._id) {
              setIncomingCall({
                callId: data.callId,
                callerId: data.callerId,
                receiverId: authUser._id, // Add the missing receiverId
                callType: data.callType,
                callerName: data.callerName || "Unknown",
                callerAvatar: data.callerAvatar,
                status: "ringing" as const, // Add the missing status
              });
              setIsCallDialogOpen(true);
            }
          });
        } else {
          console.log(
            "✅ Home: Socket already connected, reusing existing connection"
          );
          // Ensure user is added to existing socket
          if (authUser?._id) {
            console.log("🔄 Adding user to existing socket:", authUser._id);
            socket.current.emit("addUser", authUser._id, authUser);
          }
        }
      } catch (error) {
        console.error("Failed to initialize socket:", error);
        // Reset socket reference on error to allow retry
        socket.current = null;

        // Try to reconnect after a delay
        setTimeout(() => {
          if (!socket.current && authUser?._id && isAuthenticated) {
            console.log("Retrying socket initialization...");
            initializeSocket();
          }
        }, 3000);
      }
    };

    // Only initialize socket if user is authenticated
    if (isAuthenticated && authUser?._id) {
      initializeSocket();
    }

    // Cleanup function
    return () => {
      if (socket.current) {
        console.log("Cleaning up socket connection...");
        socket.current.disconnect();
        socket.current = null;
      }
    };
  }, [isAuthenticated, authUser?._id, dispatch]);

  // Periodic socket health check
  useEffect(() => {
    if (!socket.current || !authUser?._id || !isAuthenticated) return;

    const healthCheck = setInterval(() => {
      if (socket.current && !socket.current.connected) {
        console.log(
          "🔄 Socket health check: Socket disconnected, attempting to reconnect..."
        );
        // The disconnect event handler will handle reconnection
      } else if (socket.current && socket.current.connected && authUser?._id) {
        // Socket is healthy, ensure user is still added
        console.log("✅ Socket health check: Socket is healthy");
        // Optionally re-add user to ensure they're still in the active users list
        socket.current.emit("addUser", authUser._id, authUser);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(healthCheck);
  }, [socket.current, authUser?._id, isAuthenticated]);

  // Setup calling service when socket is available
  useEffect(() => {
    const setupCallingService = async () => {
      if (socket.current) {
        console.log("🔄 HOME: Setting up calling service with socket...");
        console.log("🔄 HOME: Socket ID:", socket.current?.id);
        console.log("🔄 HOME: Socket connected:", socket.current?.connected);
        await callingService.setSocket(socket.current);
        console.log("✅ HOME: Calling service socket set successfully");
      }
    };

    setupCallingService();

    return () => {
      // Don't cleanup calling service on unmount, let it persist
      console.log("Component unmounting, keeping calling service alive");
    };
  }, [socket.current]);

  // Remove duplicate useEffect hooks that were setting up duplicate event listeners
  // The event listeners are now set up in the main socket initialization useEffect

  // Mark messages as read when viewing a chat
  useEffect(() => {
    console.log("🔍 Home: currentUserChat changed:", currentUserChat);
    if (currentUserChat && currentUserChat._id) {
      console.log(
        "🔍 Home: Marking messages as read for:",
        currentUserChat._id
      );
      dispatch(markMessagesAsRead(currentUserChat._id));
    }
  }, [currentUserChat, dispatch]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [recConversation]);

  // Remove notification
  const removeNotification = (id: string) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  };

  // Handle call actions
  const handleAcceptCall = async () => {
    console.log("🔄 HOME: handleAcceptCall called");
    console.log("🔄 HOME: Incoming call data:", incomingCall);
    console.log("🔄 HOME: Current user ID:", authUser?._id);
    console.log("🔄 HOME: Socket status:", !!socket.current);
    console.log("🔄 HOME: Socket ID:", socket.current?.id);
    console.log(
      "🔄 HOME: Calling service socket ID:",
      callingService.getSocket()?.id
    );

    if (incomingCall && socket.current && authUser?._id) {
      try {
        // Emit accept call event to socket server
        socket.current.emit("acceptCall", {
          callerId: incomingCall.callerId,
          receiverId: authUser._id,
          callType: incomingCall.callType,
        });

        console.log("✅ Accept call event emitted to socket server");
        console.log("✅ Event data:", {
          callerId: incomingCall.callerId,
          receiverId: authUser._id,
          callType: incomingCall.callType,
        });

        // Update local state
        setIsCallDialogOpen(true);

        // Accept the call using calling service
        const success = await callingService.acceptCall({
          callId: incomingCall.callId || "",
          callerId: incomingCall.callerId,
          receiverId: authUser._id,
          callType: incomingCall.callType,
          callerName: incomingCall.callerName,
          callerAvatar: incomingCall.callerAvatar,
          status: "ringing",
        });

        if (success) {
          console.log("✅ Call accepted successfully in calling service");
          // The calling service will handle the call state changes
        } else {
          console.error("❌ Failed to accept call in calling service");
          alert("Failed to accept call. Please try again.");
        }
      } catch (error) {
        console.error("❌ Error accepting call:", error);
        alert("Error accepting call. Please try again.");
      }
    } else {
      console.error("❌ No incoming call data or socket available");
      console.error("❌ Incoming call:", incomingCall);
      console.error("❌ Socket:", socket.current);
    }
  };

  const handleDeclineCall = async () => {
    console.log("🔄 Home: Declining incoming call...");
    console.log("Incoming call data:", incomingCall);

    if (incomingCall && socket.current && authUser?._id) {
      try {
        // Emit decline call event to socket server
        socket.current.emit("declineCall", {
          callerId: incomingCall.callerId,
          receiverId: authUser._id,
          callType: incomingCall.callType,
        });

        console.log("✅ Decline call event emitted to socket server");

        // Clean up local state
        setIncomingCall(null);
        setIsCallDialogOpen(false);

        // Decline the call using calling service
        await callingService.declineCall({
          callId: incomingCall.callId || "",
          callerId: incomingCall.callerId,
          receiverId: authUser._id,
          callType: incomingCall.callType,
          callerName: incomingCall.callerName,
          callerAvatar: incomingCall.callerAvatar,
          status: "ringing",
        });

        console.log("✅ Call declined successfully");
      } catch (error) {
        console.error("❌ Error declining call:", error);
        // Still clean up state even if there's an error
        setIncomingCall(null);
        setIsCallDialogOpen(false);
      }
    } else {
      console.error("❌ No incoming call data or socket available");
      // Clean up state
      setIncomingCall(null);
      setIsCallDialogOpen(false);
    }
  };

  const handleEndCall = async () => {
    console.log("🔄 Home: Ending call...");
    console.log("Current call state:", { incomingCall, isCallDialogOpen });

    try {
      // End the call using calling service
      await callingService.endCall();

      console.log("✅ Call ended successfully");

      // Clean up local state
      setIncomingCall(null);
      setIsCallDialogOpen(false);

      // Emit end call event to socket server if we have call data
      if (incomingCall && socket.current && authUser?._id) {
        socket.current.emit("endCall", {
          callerId: incomingCall.callerId,
          receiverId: authUser._id,
          callType: incomingCall.callType,
        });
        console.log("✅ End call event emitted to socket server");
      }
    } catch (error) {
      console.error("❌ Error ending call:", error);
      // Still clean up state even if there's an error
      setIncomingCall(null);
      setIsCallDialogOpen(false);
    }
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar - Fixed width on desktop, hidden on mobile */}
      <div className="hidden lg:block w-72 xl:w-80 flex-shrink-0">
        <Header activeUser={activeUser} unreadCounts={unreadCounts} />
      </div>

      {/* Main Chat Area - Responsive Layout */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Fixed Header - Responsive positioning */}
        <div className="sticky top-0 z-20 bg-white shadow-sm">
          <Dashboardheader
            activeUser={activeUser}
            currentUserChat={currentUserChat}
            socket={socket.current}
            currentUserId={authUser?._id || ""}
          />
        </div>

        {/* Desktop Chat Content - Hidden on mobile */}
        <div
          className="hidden lg:block flex-1 overflow-y-auto bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url("./back.png")`,
          }}
        >
          <div className="px-3 sm:px-4 md:px-6 lg:px-8 max-w-4xl mx-auto py-20">
            {currentUserChat ? (
              <>
                {recConversation && recConversation.length > 0 ? (
                  recConversation.map((con, index) =>
                    con.senderId === authUser?._id ? (
                      <div
                        ref={
                          index === recConversation.length - 1
                            ? scrollRef
                            : null
                        }
                        key={con._id}
                        className="mb-4 sm:mb-6 animate-slideInRight"
                      >
                        {/* My message */}
                        <div className="flex justify-end">
                          <div className="flex flex-col items-end max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
                            <div className="bg-[#CCE2D3] rounded-2xl px-3 sm:px-4 py-2 sm:py-3 shadow-sm">
                              <p className="text-gray-800 break-words text-sm sm:text-base">
                                {con.message.text}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-xs sm:text-sm text-gray-500">
                              <FaCheck className="text-green-500" />
                              <span>{formatTime(con.createdAt)}</span>
                              <span className="font-medium">You</span>
                              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-300 rounded-full overflow-hidden">
                                <img
                                  src="/profile.jpg"
                                  alt="profile"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        ref={
                          index === recConversation.length - 1
                            ? scrollRef
                            : null
                        }
                        key={con._id}
                        className="mb-4 sm:mb-6 animate-slideInLeft"
                      >
                        {/* Other person's message */}
                        <div className="flex justify-start">
                          <div className="flex flex-col max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
                            <div className="bg-white rounded-2xl px-3 sm:px-4 py-2 sm:py-3 shadow-sm">
                              <p className="text-gray-800 break-words text-sm sm:text-base">
                                {con.message.text}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-xs sm:text-sm text-gray-500">
                              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-300 rounded-full overflow-hidden">
                                <img
                                  src="/profile.jpg"
                                  alt="profile"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <span className="font-medium">
                                {currentUserChat.name}
                              </span>
                              <span>{formatTime(con.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  )
                ) : (
                  <div className="text-center text-gray-500 mt-8">
                    <p className="text-sm sm:text-base">
                      No messages yet. Start the conversation!
                    </p>
                  </div>
                )}

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                  <div className="flex justify-start mb-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl px-3 sm:px-4 py-2 sm:py-3 shadow-sm">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center px-4">
                  <img
                    src="/chat.gif"
                    alt="chat"
                    className="w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 lg:w-80 lg:h-80 mx-auto mb-4 sm:mb-6 object-contain"
                  />
                  <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl text-gray-600 font-medium">
                    <span>Come on guys let's chat...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Content */}
        <div className="lg:hidden flex-1 overflow-y-auto">
          {mobileTab === "chat" && currentUserChat ? (
            // Mobile Chat View
            <div
              className="flex-1 overflow-y-auto bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `url("./back.png")`,
              }}
            >
              <div className="px-3 sm:px-4 py-20 pb-32">
                {recConversation && recConversation.length > 0 ? (
                  recConversation.map((con, index) =>
                    con.senderId === authUser?._id ? (
                      <div
                        ref={
                          index === recConversation.length - 1
                            ? scrollRef
                            : null
                        }
                        key={con._id}
                        className="mb-4 sm:mb-6 animate-slideInRight"
                      >
                        {/* My message */}
                        <div className="flex justify-end">
                          <div className="flex flex-col items-end max-w-xs sm:max-w-sm">
                            <div className="bg-[#CCE2D3] rounded-2xl px-3 sm:px-4 py-2 sm:py-3 shadow-sm">
                              <p className="text-gray-800 break-words text-sm sm:text-base">
                                {con.message.text}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-xs sm:text-sm text-gray-500">
                              <FaCheck className="text-green-500" />
                              <span>{formatTime(con.createdAt)}</span>
                              <span className="font-medium">You</span>
                              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-300 rounded-full overflow-hidden">
                                <img
                                  src="/profile.jpg"
                                  alt="profile"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        ref={
                          index === recConversation.length - 1
                            ? scrollRef
                            : null
                        }
                        key={con._id}
                        className="mb-4 sm:mb-6 animate-slideInLeft"
                      >
                        {/* Other person's message */}
                        <div className="flex justify-start">
                          <div className="flex flex-col max-w-xs sm:max-w-sm">
                            <div className="bg-white rounded-2xl px-3 sm:px-4 py-2 sm:py-3 shadow-sm">
                              <p className="text-gray-800 break-words text-sm sm:text-base">
                                {con.message.text}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-xs sm:text-sm text-gray-500">
                              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-300 rounded-full overflow-hidden">
                                <img
                                  src="/profile.jpg"
                                  alt="profile"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <span className="font-medium">
                                {currentUserChat.name}
                              </span>
                              <span>{formatTime(con.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  )
                ) : (
                  <div className="text-center text-gray-500 mt-8">
                    <p className="text-sm sm:text-base">
                      No messages yet. Start the conversation!
                    </p>
                  </div>
                )}

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                  <div className="flex justify-start mb-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl px-3 sm:px-4 py-2 sm:py-3 shadow-sm">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : mobileTab === "chat" ? (
            // Mobile Chat List View
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Recent Chats
              </h2>
              <div className="space-y-3">
                {activeUser && activeUser.length > 0 ? (
                  activeUser.map((user: any, index: number) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg p-4 shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        // Set this user as current chat
                        dispatch(setCurrentUser(user));
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-300 rounded-full overflow-hidden">
                          <img
                            src={user.avatar || "/profile.jpg"}
                            alt={user.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{user.name}</h3>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-lg p-4 shadow-sm border">
                    <p className="text-gray-600 text-center">No recent chats available</p>
                  </div>
                )}
              </div>
            </div>
          ) : mobileTab === "contacts" ? (
            // Mobile Contacts View
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Contacts
              </h2>
              <div className="space-y-3">
                {activeUser && activeUser.length > 0 ? (
                  activeUser.map((user: any, index: number) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg p-4 shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        // Set this user as current chat
                        dispatch(setCurrentUser(user));
                        setMobileTab("chat");
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-300 rounded-full overflow-hidden">
                          <img
                            src={user.avatar || "/profile.jpg"}
                            alt={user.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{user.name}</h3>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-lg p-4 shadow-sm border">
                    <p className="text-gray-600 text-center">No contacts available</p>
                  </div>
                )}
              </div>
            </div>
          ) : mobileTab === "people" ? (
            // Mobile People View
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Active People
              </h2>
              <div className="space-y-3">
                {activeUser && activeUser.length > 0 ? (
                  activeUser.map((user: any, index: number) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg p-4 shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        // Set this user as current chat
                        dispatch(setCurrentUser(user));
                        setMobileTab("chat");
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-300 rounded-full overflow-hidden">
                          <img
                            src={user.avatar || "/profile.jpg"}
                            alt={user.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{user.name}</h3>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-green-600 font-medium">Online</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-lg p-4 shadow-sm border">
                    <p className="text-gray-600 text-center">No active people available</p>
                  </div>
                )}
              </div>
            </div>
          ) : mobileTab === "calls" ? (
            // Mobile Calls View
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Call History
              </h2>
              <div className="space-y-3">
                {/* This would show real call history from your calling service */}
                <div className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-lg">📞</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">Recent Calls</h3>
                      <p className="text-sm text-gray-500">Call history will be populated from your calling service</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-lg">✅</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">Call Features</h3>
                      <p className="text-sm text-gray-500">Audio and video calling available</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : mobileTab === "groups" ? (
            // Mobile Groups View
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Groups
              </h2>
              <div className="space-y-3">
                {/* This would show real groups from your group management */}
                <div className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 text-lg">👥</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">Group Management</h3>
                      <p className="text-sm text-gray-500">Create and manage group chats</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-orange-600 text-lg">➕</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">Create Group</h3>
                      <p className="text-sm text-gray-500">Start a new group conversation</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : mobileTab === "settings" ? (
            // Mobile Settings View
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Settings
              </h2>
              <div className="space-y-3">
                {authUser ? (
                  <>
                    <div className="bg-white rounded-lg p-4 shadow-sm border">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden">
                          <img
                            src="/profile.jpg"
                            alt={authUser.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{authUser.name}</h3>
                          <p className="text-sm text-gray-500">{authUser.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm border">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 text-lg">👤</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">Profile</h3>
                          <p className="text-sm text-gray-500">Edit your profile information</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm border">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                          <span className="text-red-600 text-lg">🚪</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">Logout</h3>
                          <p className="text-sm text-gray-500">Sign out of your account</p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-white rounded-lg p-4 shadow-sm border">
                    <p className="text-gray-600 text-center">User not authenticated</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
          <div className="flex justify-around items-center py-2">
            {[
              {
                id: "chat",
                label: "Chats",
                icon: "💬",
                color: "text-blue-500",
                bgColor: "bg-blue-50",
              },
              {
                id: "contacts",
                label: "Contacts",
                icon: "👥",
                color: "text-green-500",
                bgColor: "bg-green-50",
              },
              {
                id: "people",
                label: "People",
                icon: "👤",
                color: "text-purple-500",
                bgColor: "bg-purple-50",
              },
              {
                id: "calls",
                label: "Calls",
                icon: "📞",
                color: "text-red-500",
                bgColor: "bg-red-50",
              },
              {
                id: "groups",
                label: "Groups",
                icon: "👥",
                color: "text-orange-500",
                bgColor: "bg-orange-50",
              },
              {
                id: "settings",
                label: "Settings",
                icon: "⚙️",
                color: "text-gray-500",
                bgColor: "bg-gray-50",
              },
            ].map((item) => {
              const isActive = mobileTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setMobileTab(item.id)}
                  className={`flex flex-col items-center justify-center w-16 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? `${item.bgColor} ${item.color}`
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <span className="text-xl mb-1">{item.icon}</span>
                  <span
                    className={`text-xs font-medium ${
                      isActive ? item.color : "text-gray-500"
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Chat Input - Shows when in chat view */}
        {mobileTab === "chat" && currentUserChat && (
          <div className="lg:hidden fixed bottom-16 left-0 right-0 z-40 bg-white border-t border-gray-200 p-3">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Fixed Footer - Responsive positioning */}
        <div className="hidden lg:block sticky bottom-0 z-20 bg-white border-t">
          <Dashboardbottom scrollRef={scrollRef} socket={socket.current} />
        </div>
      </div>

      {/* Incoming Call Dialog */}
      {incomingCall && (
        <CallDialog
          isOpen={isCallDialogOpen}
          onClose={() => {
            setIsCallDialogOpen(false);
            setIncomingCall(null);
          }}
          callType={incomingCall.callType}
          callerName={incomingCall.callerName}
          callerAvatar={incomingCall.callerAvatar}
          isIncoming={true}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
          onEndCall={handleEndCall}
          onCancel={handleDeclineCall} // Use decline as cancel for incoming calls
          callData={incomingCall}
          onCallEnded={() => {
            console.log("🔄 Incoming call ended, refreshing call history...");
            // Emit custom event to refresh call history
            window.dispatchEvent(
              new CustomEvent("callEnded", { detail: incomingCall })
            );
          }}
        />
      )}

      {/* Notifications */}
      {notifications.map((notification, index) => (
        <div key={notification.id} style={{ top: `${4 + index * 5}rem` }}>
          <Notification
            message={notification.message}
            senderName={notification.senderName}
            onClose={() => removeNotification(notification.id)}
            duration={4000}
          />
        </div>
      ))}
    </div>
  );
};

export default Home;

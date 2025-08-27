import { FC, useState, useEffect } from "react";
import { BsThreeDots } from "react-icons/bs";
import { MdVideoCall, MdWifiCalling3 } from "react-icons/md";
import CallDialog from "./callDialog";
import callingService from "../../services/callingService";

interface DashboardheaderProps {
  currentUserChat: any;
  activeUser: any[];
  socket: any;
  currentUserId: string; // Add current user ID
}

const Dashboardheader: FC<DashboardheaderProps> = ({
  currentUserChat,
  activeUser,
  socket,
  currentUserId,
}) => {
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [callType, setCallType] = useState<"audio" | "video">("audio");
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callData, setCallData] = useState<any>(null);

  // Setup calling service when component mounts
  useEffect(() => {
    if (socket) {
      callingService.setSocket(socket);
    }

    return () => {
      callingService.cleanup();
    };
  }, [socket]);

  if (!currentUserChat) return null;

  const isUserActive =
    activeUser &&
    activeUser.length > 0 &&
    activeUser.some((user) => user.userId === currentUserChat._id);

  // Handle call initiation
  const handleCall = async (type: "audio" | "video") => {
    console.log("=== CALL INITIATION DEBUG ===");
    console.log("Socket available:", !!socket);
    console.log("Socket object:", socket);
    console.log("Current user ID:", currentUserId);
    console.log("Current user chat:", currentUserChat);
    console.log("Calling service socket:", callingService.socketStatus);

    if (socket) {
      console.log("Socket connected:", socket.connected);
      console.log("Socket ID:", socket.id);
    }

    if (!socket) {
      console.log("❌ Socket not available");
      alert("Socket not connected. Please refresh the page.");
      return;
    }

    if (!currentUserId) {
      console.log("❌ Current user ID not available");
      alert("User not authenticated. Please login again.");
      return;
    }

    if (!currentUserChat || !currentUserChat._id) {
      console.log("❌ Current user chat not available");
      alert("No user selected for call.");
      return;
    }

    console.log("✅ All checks passed, proceeding with call");
    console.log("Call details:", {
      callerId: currentUserId,
      receiverId: currentUserChat._id,
      callType: type,
      currentUserChat,
    });

    // DEBUG: Check socket server state before initiating call
    console.log("🔍 DEBUG: Checking socket server state...");
    await callingService.debugSocketServer();

    setCallType(type);
    setIsIncomingCall(false);
    setIsCallDialogOpen(true);
    setIsCallActive(false); // Don't set active yet - wait for call to connect
    // Set connecting state for outgoing calls

    // Create call data
    const callDataObj = {
      callerId: currentUserId,
      callerName: "You", // Current user's name
      receiverId: currentUserChat._id,
      callType: type,
      callerAvatar: "/profile.jpg",
    };

    setCallData(callDataObj);

    try {
      // Initiate the call using calling service
      await callingService.initiateCall(currentUserChat._id, type);

      console.log("✅ Call initiated successfully!");
      // Keep connecting state - will be updated by call dialog
      console.log("Call dialog state:", {
        isOpen: isCallDialogOpen,
        isCallActive,
        callType: type,
      });

      // Set up audio interaction handler
      setTimeout(() => {
        if (callingService.isCallActive()) {
          console.log("🔊 Call is active, setting up audio interaction...");
          callingService.handleUserInteraction();
        }
      }, 3000); // Wait 3 seconds for call to establish
    } catch (error) {
      console.error("❌ Error initiating call:", error);
      setIsCallDialogOpen(false);

      alert("Error initiating call. Please try again.");
    }
  };

  // Call action handlers - These are now handled by the calling service
  const handleAcceptCall = async () => {
    console.log(
      "🔄 Dashboard header: Call accepted - delegating to calling service"
    );
    // The calling service will handle this
  };

  const handleDeclineCall = () => {
    console.log(
      "🔄 Dashboard header: Call declined - delegating to calling service"
    );
    // The calling service will handle this
  };

  const handleEndCall = async () => {
    console.log(
      "🔄 Dashboard header: Call ended - delegating to calling service"
    );
    // The calling service will handle this
  };

  const handleCancelCall = async () => {
    console.log(
      "🔄 Dashboard header: Call cancelled - delegating to calling service"
    );
    // The calling service will handle this
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* User Info - Responsive */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Avatar */}
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {currentUserChat.name
              ? currentUserChat.name.charAt(0).toUpperCase()
              : "U"}
          </div>

          {/* User Details */}
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-800 text-sm sm:text-base truncate">
              {currentUserChat.name || "Unknown User"}
            </h3>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isUserActive ? "bg-green-500" : "bg-gray-400"
                }`}
              ></div>
              <span className="text-xs sm:text-sm text-gray-500 truncate">
                {isUserActive ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        </div>

        {/* Call Actions - Responsive */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Audio Call Button */}
          <button
            onClick={() => handleCall("audio")}
            className="p-2 sm:p-3 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors shadow-sm"
            title="Audio Call"
          >
            <MdWifiCalling3 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Video Call Button */}
          <button
            onClick={() => handleCall("video")}
            className="p-2 sm:p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors shadow-sm"
            title="Video Call"
          >
            <MdVideoCall className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* More Options */}
          <button className="p-2 sm:p-3 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <BsThreeDots className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Call Dialog */}
      {isCallDialogOpen && (
        <CallDialog
          isOpen={isCallDialogOpen}
          onClose={() => {
            setIsCallDialogOpen(false);
            setIsCallActive(false);
          }}
          callType={callType}
          callerName={currentUserChat.name || "Unknown"}
          callerAvatar="/profile.jpg"
          isIncoming={isIncomingCall}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
          onEndCall={handleEndCall}
          onCancel={handleCancelCall}
          callData={callData}
          onCallEnded={() => {
            console.log("🔄 Call ended, refreshing call history...");
            // This will trigger a refresh of call history in the calling component
            // You can add a callback prop to refresh call history if needed
          }}
        />
      )}
    </div>
  );
};

export default Dashboardheader;

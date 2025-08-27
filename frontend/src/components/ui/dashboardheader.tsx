import React, { useState } from "react";
import { IoCall, IoVideocam } from "react-icons/io5";
import callingService from "../../services/callingService";

interface DashboardHeaderProps {
  currentUserChat: any;
  onCallInitiated: (callType: "audio" | "video") => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  currentUserChat,
  onCallInitiated,
}) => {
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [callType, setCallType] = useState<"audio" | "video">("audio");

  const handleCall = async (type: "audio" | "video") => {
    try {
      // Basic validation
      if (!currentUserChat?._id) {
        console.error("No current user chat available");
        return;
      }

      if (!callingService.getSocket()) {
        console.error("No socket connection available");
        return;
      }

      if (!callingService.getSocket()?.connected) {
        console.error("Socket not connected");
        return;
      }

      console.log("All checks passed, proceeding with call");
      console.log("Call details:", {
        callerId: currentUserChat._id,
        receiverId: currentUserChat._id,
        callType: type,
        currentUserChat,
      });

      // Debug socket server state
      console.log("Checking socket server state...");
      await callingService.debugSocketServer();

      // Set call type and open dialog
      setCallType(type);
      setIsCallDialogOpen(true);

      // Initiate call
      const success = await callingService.initiateCall(currentUserChat._id, type);
      
      if (success) {
        console.log("Call initiated successfully!");
        console.log("Call dialog state:", {
          isOpen: isCallDialogOpen,
          isCallActive: false,
          callType: type,
        });
        
        // Set up audio interaction after call is initiated
        setTimeout(() => {
          if (callingService.isCallInProgress()) {
            console.log("Call is active, setting up audio interaction...");
            callingService.handleUserInteraction();
            
            // Test audio playback
            setTimeout(() => {
              callingService.testAudioPlayback();
            }, 1000);
          }
        }, 2000);
      } else {
        console.error("Failed to initiate call");
        setIsCallDialogOpen(false);
      }
    } catch (error) {
      console.error("Error initiating call:", error);
      setIsCallDialogOpen(false);
    }
  };

  const closeCallDialog = () => {
    setIsCallDialogOpen(false);
  };

  return (
    <div className="bg-white shadow-sm border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-full overflow-hidden">
            <img
              src={currentUserChat?.avatar || "/profile.jpg"}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {currentUserChat?.name || "User"}
            </h1>
            <p className="text-sm text-gray-500">
              {currentUserChat?.email || "user@example.com"}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleCall("audio")}
            className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
          >
            <IoCall size={20} />
            <span>Audio Call</span>
          </button>

          <button
            onClick={() => handleCall("video")}
            className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            <IoVideocam size={20} />
            <span>Video Call</span>
          </button>
        </div>
      </div>

      {/* Call Dialog */}
      {isCallDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                {callType === "video" ? "Video Call" : "Audio Call"}
              </h3>
              <p className="text-gray-600 mb-6">
                Calling {currentUserChat?.name || "User"}...
              </p>
              
              <div className="flex justify-center space-x-4">
                <button
                  onClick={closeCallDialog}
                  className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
                >
                  Cancel Call
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardHeader;

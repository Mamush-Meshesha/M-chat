import { FC, useState, useEffect, useRef } from "react";
import {
  IoCall,
  IoCallOutline,
  IoMic,
  IoMicOff,
  IoVideocam,
  IoVideocamOff,
  IoClose,
} from "react-icons/io5";
import { BsThreeDots } from "react-icons/bs";
import callingService from "../../services/callingService";

interface CallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  callType: "audio" | "video";
  callerName: string;
  callerAvatar?: string;
  isIncoming?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onEndCall?: () => void;
  onCancel?: () => void; // Add cancel handler
  callData?: any; // Add call data for WebRTC
  onCallEnded?: () => void; // Add callback to refresh call history
}

const CallDialog: FC<CallDialogProps> = ({
  isOpen,
  onClose,
  callType,
  callerName,
  callerAvatar = "/profile.jpg",
  isIncoming = false,
  onAccept,
  onDecline,
  onEndCall,
  callData,
  onCallEnded,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const durationRef = useRef<NodeJS.Timeout | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // Handle incoming call
  useEffect(() => {
    if (isIncoming && isOpen) {
      // Play ringtone for incoming calls
      callingService.startRingtone();
      console.log("🔔 Starting ringtone for incoming call");
    }

    return () => {
      callingService.stopRingtone();
      console.log("🔇 Stopping ringtone");
    };
  }, [isIncoming, isOpen]);

  // Handle call duration timer
  useEffect(() => {
    if (isCallActive) {
      console.log("🕐 Starting duration timer...");
      durationRef.current = setInterval(() => {
        setCallDuration((prev) => {
          const newDuration = prev + 1;
          console.log(`🕐 Duration: ${newDuration} seconds`);
          return newDuration;
        });
      }, 1000);
    } else {
      if (durationRef.current) {
        console.log("🕐 Stopping duration timer...");
        clearInterval(durationRef.current);
        durationRef.current = null;
      }
    }

    return () => {
      if (durationRef.current) {
        clearInterval(durationRef.current);
      }
    };
  }, [isCallActive]);

  // Setup calling service callbacks
  useEffect(() => {
    callingService.onCallConnected = (data) => {
      console.log("🎉 CallDialog: Call connected:", data);
      setIsConnecting(false);
      setIsCallActive(true);
      callingService.stopCallRingtone();

      // Start duration timer for both caller and receiver
      setCallDuration(0);

      console.log("🎵 Audio should now be working between both users!");
    };

    callingService.onCallEnded = (data) => {
      console.log("Call ended:", data);
      setIsCallActive(false);
      setIsConnecting(false);
      setCallDuration(0);
      setLocalStream(null);
      setRemoteStream(null);

      // Call the callback to refresh call history
      if (onCallEnded) {
        onCallEnded();
      }

      onClose();
    };

    callingService.onCallFailed = (data) => {
      console.log("Call failed:", data);
      setIsConnecting(false);
      setIsCallActive(false);
      callingService.stopCallRingtone();

      // Call the callback to refresh call history
      if (onCallEnded) {
        onCallEnded();
      }

      // You can show an error message here
    };

    callingService.onRemoteStream = (stream) => {
      console.log("🎵 CallDialog: Remote stream received:", stream);
      console.log(
        "🎵 Stream tracks:",
        stream.getTracks().map((t) => ({ kind: t.kind, enabled: t.enabled }))
      );
      setRemoteStream(stream);

      if (callType === "video") {
        console.log("📹 Video call - remote stream received");
        // Ensure remote video element is updated
        setTimeout(() => {
          if (remoteVideoRef.current && stream) {
            remoteVideoRef.current.srcObject = stream;
            console.log("✅ Remote video element updated");
          }
        }, 100);
      }
    };

    return () => {
      callingService.onCallConnected = undefined;
      callingService.onCallEnded = undefined;
      callingService.onCallFailed = undefined;
      callingService.onRemoteStream = undefined;
    };
  }, [onClose, onCallEnded]);

  // Update video elements when streams change
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      console.log("📹 Setting local video stream:", localStream);
      localVideoRef.current.srcObject = localStream;
      // Ensure video plays
      localVideoRef.current.play().catch(console.error);
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      console.log("📹 Setting remote video stream:", remoteStream);
      remoteVideoRef.current.srcObject = remoteStream;
      // Ensure video plays
      remoteVideoRef.current.play().catch(console.error);
    }
  }, [remoteStream]);

  // Update audio elements when streams change
  useEffect(() => {
    if (localAudioRef.current && localStream) {
      localAudioRef.current.srcObject = localStream;
      localAudioRef.current.muted = true; // Mute local audio to prevent echo
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      console.log("🎵 Setting remote audio stream:", remoteStream);
      console.log(
        "🎵 Remote stream tracks:",
        remoteStream.getTracks().map((t) => ({
          kind: t.kind,
          enabled: t.enabled,
          muted: t.muted,
          readyState: t.readyState,
        }))
      );

      remoteAudioRef.current.srcObject = remoteStream;

      // Try to play the audio
      remoteAudioRef.current
        .play()
        .then(() => {
          console.log("🎵 Remote audio started playing successfully");
          console.log("🎵 Audio element state:", {
            paused: remoteAudioRef.current?.paused,
            currentTime: remoteAudioRef.current?.currentTime,
            volume: remoteAudioRef.current?.volume,
            muted: remoteAudioRef.current?.muted,
          });
        })
        .catch((error) => {
          console.error("❌ Failed to play remote audio:", error);
        });
    }
  }, [remoteStream]);

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Handle call actions
  const handleAccept = async () => {
    console.log("🔄 CallDialog: Accepting call...");
    console.log("🔄 CallDialog: callData:", callData);

    if (!callData) {
      console.error("❌ No call data available");
      return;
    }

    // Validate callData has required properties
    if (!callData.callerId || !callData.receiverId || !callData.callType) {
      console.error("❌ Invalid call data:", {
        hasCallerId: !!callData.callerId,
        hasReceiverId: !!callData.receiverId,
        hasCallType: !!callData.callType,
        callData,
      });
      return;
    }

    setIsConnecting(true);

    try {
      // First emit accept call event to socket server
      if (callingService.getSocket()) {
        const acceptCallData = {
          callerId: callData.callerId,
          receiverId: callData.receiverId,
          callType: callData.callType,
        };
        console.log(
          "🔄 CallDialog: Emitting acceptCall with data:",
          acceptCallData
        );

        callingService.getSocket()?.emit("acceptCall", acceptCallData);
        console.log("✅ Accept call event emitted to socket server");
      } else {
        console.error("❌ No socket available in calling service");
        setIsConnecting(false);
        return;
      }

      // Then accept the call using calling service
      const success = await callingService.acceptCall(callData);
      if (success) {
        const stream = callingService.getLocalStream();
        setLocalStream(stream);
        setIsConnecting(false);
        setIsCallActive(true);
        console.log("✅ Call accepted successfully");

        // For video calls, ensure video elements are properly connected
        if (callData.callType === "video" && stream) {
          console.log("📹 Video call accepted, setting up video elements...");
          // Small delay to ensure video elements are ready
          setTimeout(() => {
            if (localVideoRef.current && stream) {
              localVideoRef.current.srcObject = stream;
              console.log("✅ Local video element connected");
            }
          }, 100);
        }
      } else {
        setIsConnecting(false);
        console.error("❌ Failed to accept call");
        // Don't show error message to user, just log it
        return;
      }
    } catch (error) {
      console.error("❌ Error accepting call:", error);
      setIsConnecting(false);
    }

    if (onAccept) onAccept();
  };

  const handleDecline = () => {
    console.log("🔄 CallDialog: Declining call...");

    // First emit decline call event to socket server
    if (callingService.getSocket()) {
      callingService.getSocket()?.emit("declineCall", {
        callerId: callData?.callerId,
        receiverId: callData?.receiverId,
        callType: callData?.callType,
      });
      console.log("✅ Decline call event emitted to socket server");
    }

    callingService.stopRingtone();
    if (onDecline) onDecline();
    onClose();
  };

  const handleCancel = () => {
    console.log("🔄 CallDialog: Cancelling call...");
    console.log("Current state:", { isIncoming, isCallActive, isConnecting });

    // First emit cancel call event to socket server
    if (callingService.getSocket()) {
      callingService.getSocket()?.emit("cancelCall", {
        callerId: callData?.callerId,
        receiverId: callData?.receiverId,
        callType: callData?.callType,
      });
      console.log("✅ Cancel call event emitted to socket server");
    }

    callingService.stopCallRingtone();

    if (onCancel) {
      console.log("🔄 Calling onCancel callback...");
      onCancel();
    } else {
      console.log("❌ onCancel callback not available");
    }

    console.log("🔄 Closing dialog...");
    onClose();
  };

  const handleEndCall = () => {
    console.log("🔄 CallDialog: Ending call...");

    // First emit end call event to socket server
    if (callingService.getSocket()) {
      callingService.getSocket()?.emit("endCall", {
        callerId: callData?.callerId,
        receiverId: callData?.receiverId,
        callType: callData?.callType,
      });
      console.log("✅ End call event emitted to socket server");
    }

    callingService.endCall();
    setIsCallActive(false);
    setCallDuration(0);
    setLocalStream(null);
    setRemoteStream(null);

    // Call the callback to refresh call history
    if (onCallEnded) {
      onCallEnded();
    }

    if (onEndCall) onEndCall();
    onClose();
  };

  // Toggle mute
  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            {isIncoming ? "Incoming Call" : "Calling..."}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
          >
            <IoClose size={24} />
          </button>
        </div>

        {/* Caller Info */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-4 relative">
            <img
              src={callerAvatar}
              alt={callerName}
              className="w-full h-full rounded-full object-cover"
            />
            {callType === "video" && !isVideoOff && (
              <div className="absolute inset-0 rounded-full border-4 border-green-500 animate-pulse"></div>
            )}
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            {callerName}
          </h3>
          <p className="text-gray-600">
            {isCallActive
              ? formatDuration(callDuration)
              : isIncoming
              ? isCallActive
                ? formatDuration(callDuration)
                : callType === "video"
                ? "Incoming Video Call"
                : "Incoming Audio Call"
              : isConnecting
              ? "Connecting..."
              : "Calling..."}
          </p>
          {isCallActive && remoteStream && (
            <p className="text-green-600 text-sm mt-1">
              {callType === "video"
                ? "📹 Video & Audio Connected"
                : "🎵 Audio Connected"}
            </p>
          )}
          {isConnecting && (
            <p className="text-blue-600 text-sm mt-2">Connecting...</p>
          )}
          {isIncoming && !isCallActive && (
            <p className="text-green-600 text-sm mt-2">Incoming call...</p>
          )}
        </div>

        {/* Video Preview (for video calls) */}
        {callType === "video" && (
          <div className="mb-6">
            <div className="relative bg-gray-100 rounded-lg overflow-hidden h-48">
              {!isVideoOff && localStream ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <IoVideocamOff size={48} className="text-gray-400" />
                </div>
              )}
              <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                You
              </div>
            </div>

            {/* Remote video when call is active */}
            {isCallActive && remoteStream && (
              <div className="mt-4 relative bg-gray-100 rounded-lg overflow-hidden h-32">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }} // Mirror the remote video
                />
                <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  {callerName}
                </div>
              </div>
            )}

            {/* Show loading state when waiting for remote video */}
            {isCallActive && !remoteStream && callType === "video" && (
              <div className="mt-4 relative bg-gray-100 rounded-lg overflow-hidden h-32 flex items-center justify-center">
                <div className="text-gray-500 text-sm">
                  Waiting for video...
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hidden audio elements for audio calls */}
        <audio
          ref={localAudioRef}
          autoPlay
          muted
          playsInline
          style={{ display: "none" }}
        />
        <audio
          ref={remoteAudioRef}
          autoPlay
          playsInline
          style={{ display: "none" }}
        />

        {/* Call Controls */}
        <div className="flex justify-center space-x-4 mb-6">
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full transition-colors duration-200 ${
              isMuted
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <IoMicOff size={24} /> : <IoMic size={24} />}
          </button>

          {/* Video Toggle Button (for video calls) */}
          {callType === "video" && (
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full transition-colors duration-200 ${
                isVideoOff
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              title={isVideoOff ? "Turn on video" : "Turn off video"}
            >
              {isVideoOff ? (
                <IoVideocamOff size={24} />
              ) : (
                <IoVideocam size={24} />
              )}
            </button>
          )}

          {/* More Options */}
          <button
            className="p-4 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors duration-200"
            title="More options"
          >
            <BsThreeDots size={24} />
          </button>
        </div>

        {/* Call Action Buttons */}
        {isIncoming ? (
          <div className="flex justify-center space-x-4">
            {/* Decline Button */}
            <button
              onClick={handleDecline}
              className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors duration-200"
              title="Decline call"
            >
              <IoCallOutline size={24} />
            </button>

            {/* Accept Button */}
            <button
              onClick={handleAccept}
              className="p-4 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors duration-200"
              title="Accept call"
            >
              <IoCall size={24} />
            </button>
          </div>
        ) : isCallActive ? (
          /* End Call Button for active calls */
          <div className="flex justify-center">
            <button
              onClick={handleEndCall}
              className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors duration-200"
              title="End call"
            >
              <IoCallOutline size={24} />
            </button>
          </div>
        ) : (
          /* Cancel Button for outgoing calls that haven't connected yet */
          <div className="flex justify-center">
            <button
              onClick={handleCancel}
              className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors duration-200"
              title="Cancel call"
            >
              <IoCallOutline size={24} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallDialog;

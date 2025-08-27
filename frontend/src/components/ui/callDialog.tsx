import { FC, useState, useEffect, useRef, useMemo } from "react";
import {
  IoCall,
  IoCallOutline,
  IoMic,
  IoMicOff,
  IoVideocam,
  IoVideocamOff,
  IoClose,
} from "react-icons/io5";
import { IoDesktop } from "react-icons/io5";
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
  onCancel?: () => void;
  onCallEnded?: () => void;
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
  onCancel,
  onCallEnded,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteScreenShareStream, setRemoteScreenShareStream] =
    useState<MediaStream | null>(null);
  const audioSetupComplete = useRef(false);

  const actualCallType = useMemo(() => {
    const activeCall = callingService.getCurrentCall();
    if (activeCall && activeCall.callData) {
      return activeCall.callData.callType;
    }
    return callType;
  }, [callType, callingService]);

  const durationRef = useRef<number | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const remoteScreenShareRef = useRef<HTMLVideoElement>(null);

  // Handle incoming call
  useEffect(() => {
    if (isIncoming && isOpen) {
      callingService.startRingtone();
    }

    return () => {
      callingService.stopRingtone();
    };
  }, [isIncoming, isOpen]);

  // CRITICAL FIX: Handle user interaction to enable audio playback
  useEffect(() => {
    const handleUserInteraction = () => {
      if (remoteAudioRef.current && remoteAudioRef.current.paused) {
        remoteAudioRef.current.play().catch((error) => {
          console.error("Audio play failed:", error);
        });
      }
    };

    // Add event listeners for user interaction
    document.addEventListener("click", handleUserInteraction, { once: true });
    document.addEventListener("touchstart", handleUserInteraction, {
      once: true,
    });
    document.addEventListener("keydown", handleUserInteraction, { once: true });

    return () => {
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("touchstart", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
    };
  }, []);

  // Handle call state changes
  useEffect(() => {
    if (isOpen) {
      const activeCall = callingService.getCurrentCall();
      if (activeCall) {
        setLocalStream(activeCall.localStream);

        setIsCallActive(activeCall.callData?.status === "active");
        setIsConnecting(activeCall.callData?.status === "connecting");
      }
    }
  }, [isOpen]);

  // Handle call duration timer
  useEffect(() => {
    if (isCallActive && !durationRef.current) {
      const startTime = Date.now();
      durationRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setCallDuration(elapsed);
      }, 1000);
    }

    return () => {
      if (durationRef.current) {
        clearInterval(durationRef.current);
        durationRef.current = null;
      }
    };
  }, [isCallActive]);

  // Set up calling service callbacks
  useEffect(() => {
    callingService.onCallConnected = (data) => {
      console.log("Call connected:", data);
      setIsConnecting(false);
      setIsCallActive(true);
      callingService.stopCallRingtone();
    };

    callingService.onCallEnded = () => {
      console.log("Call ended");
      setIsCallActive(false);
      setIsConnecting(false);
      callingService.stopCallRingtone();
      onClose();
    };

    callingService.onCallFailed = (error) => {
      console.error("Call failed:", error);
      setIsConnecting(false);
      setIsCallActive(false);
      callingService.stopCallRingtone();

      if (onCallEnded) {
        onCallEnded();
      }
    };

    callingService.onRemoteStream = (stream) => {
      console.log("Remote stream received:", stream);

      // SINGLE AUDIO SETUP - only here, no duplicates
      if (remoteAudioRef.current && stream && !audioSetupComplete.current) {
        console.log("Setting up audio...");

        // Mark as complete immediately to prevent duplicates
        audioSetupComplete.current = true;

        // Stop any existing audio
        if (remoteAudioRef.current.srcObject) {
          remoteAudioRef.current.pause();
          remoteAudioRef.current.currentTime = 0;
        }

        // Set the new stream
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.volume = 1.0;

        // Try to play
        remoteAudioRef.current
          .play()
          .then(() => {
            console.log("Audio started successfully");
            callingService.notifyAudioSetupComplete();
          })
          .catch((error) => {
            console.error("Audio play failed:", error);
          });
      }
    };

    return () => {
      callingService.onCallConnected = null;
      callingService.onCallEnded = null;
      callingService.onCallFailed = null;
      callingService.onRemoteStream = null;
    };
  }, [onClose, onCallEnded]);

  // Update local audio element
  useEffect(() => {
    if (localAudioRef.current && localStream) {
      localAudioRef.current.srcObject = localStream;
      localAudioRef.current.muted = true;
    }
  }, [localStream]);

  // Check for remote screen share
  useEffect(() => {
    const checkScreenShare = () => {
      const screenShareStream = callingService.getRemoteScreenShareStream();
      if (screenShareStream && screenShareStream !== remoteScreenShareStream) {
        setRemoteScreenShareStream(screenShareStream);
      }
    };

    checkScreenShare();
    const interval = setInterval(checkScreenShare, 1000);

    return () => clearInterval(interval);
  }, [remoteScreenShareStream]);

  // Set remote screen share video stream
  useEffect(() => {
    if (remoteScreenShareRef.current && remoteScreenShareStream) {
      remoteScreenShareRef.current.srcObject = remoteScreenShareStream;
      remoteScreenShareRef.current.play().catch((error) => {
        console.error("Screen share video play failed:", error);
      });
    }
  }, [remoteScreenShareStream]);

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Handle call actions
  const handleAcceptCall = () => {
    if (onAccept) {
      onAccept();
    }
  };

  const handleDeclineCall = () => {
    if (onDecline) {
      onDecline();
    }
  };

  const handleEndCall = () => {
    callingService.endCall();
    if (onEndCall) {
      onEndCall();
    }
  };

  const handleCancelCall = () => {
    callingService.endCall();
    if (onCancel) {
      onCancel();
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });

        callingService.startScreenShare(screenStream);
        setIsScreenSharing(true);

        // Stop screen share when user stops sharing
        screenStream.getVideoTracks()[0].onended = () => {
          callingService.stopScreenShare();
          setIsScreenSharing(false);
        };
      } else {
        callingService.stopScreenShare();
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error("Screen share failed:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        {/* Call Header */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden">
            <img
              src={callerAvatar}
              alt={callerName}
              className="w-full h-full object-cover"
            />
          </div>
          <h3 className="text-xl font-semibold text-gray-800">{callerName}</h3>
          <p className="text-gray-600">
            {isIncoming
              ? "Incoming call..."
              : isConnecting
              ? "Connecting..."
              : isCallActive
              ? `Call in progress - ${formatDuration(callDuration)}`
              : "Calling..."}
          </p>
        </div>

        {/* Video/Audio Elements */}
        <div className="mb-6">
          {/* Local Video */}
          {actualCallType === "video" && localVideoRef.current && (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-32 bg-gray-800 rounded-lg mb-2"
            />
          )}

          {/* Remote Video */}
          {actualCallType === "video" && remoteVideoRef.current && (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-32 bg-gray-800 rounded-lg mb-2"
            />
          )}

          {/* Remote Screen Share */}
          {remoteScreenShareStream && (
            <video
              ref={remoteScreenShareRef}
              autoPlay
              playsInline
              className="w-full h-32 bg-gray-800 rounded-lg mb-2"
            />
          )}

          {/* Hidden Audio Elements */}
          <audio ref={localAudioRef} autoPlay muted />
          <audio ref={remoteAudioRef} autoPlay />
        </div>

        {/* Call Controls */}
        <div className="flex justify-center space-x-4 mb-6">
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className={`p-3 rounded-full ${
              isMuted ? "bg-red-500 text-white" : "bg-gray-200 text-gray-700"
            }`}
          >
            {isMuted ? <IoMicOff size={24} /> : <IoMic size={24} />}
          </button>

          {/* Video Toggle (only for video calls) */}
          {actualCallType === "video" && (
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full ${
                isVideoOff
                  ? "bg-red-500 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {isVideoOff ? (
                <IoVideocamOff size={24} />
              ) : (
                <IoVideocam size={24} />
              )}
            </button>
          )}

          {/* Screen Share Button */}
          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-full ${
              isScreenSharing
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            <IoDesktop size={24} />
          </button>
        </div>

        {/* Call Action Buttons */}
        <div className="flex justify-center space-x-4">
          {isIncoming ? (
            <>
              <button
                onClick={handleAcceptCall}
                className="bg-green-500 text-white p-3 rounded-full hover:bg-green-600"
              >
                <IoCall size={24} />
              </button>
              <button
                onClick={handleDeclineCall}
                className="bg-red-500 text-white p-3 rounded-full hover:bg-red-600"
              >
                <IoCallOutline size={24} />
              </button>
            </>
          ) : (
            <>
              {isCallActive ? (
                <button
                  onClick={handleEndCall}
                  className="bg-red-500 text-white p-3 rounded-full hover:bg-red-600"
                >
                  <IoCallOutline size={24} />
                </button>
              ) : (
                <button
                  onClick={handleCancelCall}
                  className="bg-red-500 text-white p-3 rounded-full hover:bg-red-600"
                >
                  <IoCallOutline size={24} />
                </button>
              )}
            </>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <IoClose size={24} />
        </button>
      </div>
    </div>
  );
};

export default CallDialog;

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
import { BsThreeDots } from "react-icons/bs";
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
  onCancel, // Add this missing prop
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
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteScreenShareStream, setRemoteScreenShareStream] =
    useState<MediaStream | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<string>("Connecting...");
  const audioSetupComplete = useRef(false);

  // Get the actual call type from the calling service or fallback to prop
  const actualCallType = useMemo(() => {
    // Check if we have an active call and what type it actually is
    const activeCall = callingService.getCurrentCall();
    if (activeCall && activeCall.callData) {
      return activeCall.callData.callType;
    }
    return callType;
  }, [callType, callingService]);

  // Check if this is actually a video call (has video tracks)
  const isActuallyVideoCall = useMemo(() => {
    if (!remoteStream) return false;
    const videoTracks = remoteStream.getVideoTracks();
    return (
      videoTracks.length > 0 &&
      videoTracks.some((track) => track.readyState === "live")
    );
  }, [remoteStream]);

  const durationRef = useRef<number | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const remoteScreenShareRef = useRef<HTMLVideoElement>(null);

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

  // CRITICAL FIX: Handle user interaction to enable audio playback
  useEffect(() => {
    if (isOpen && remoteStream && remoteAudioRef.current) {
      const handleUserInteraction = () => {
        console.log(
          "👆 User interaction detected, attempting to start audio..."
        );
        if (remoteAudioRef.current && remoteAudioRef.current.paused) {
          remoteAudioRef.current
            .play()
            .then(() => {
              console.log(
                "✅ Audio started successfully after user interaction"
              );
            })
            .catch((error) => {
              console.error(
                "❌ Audio start failed even after user interaction:",
                error
              );
            });
        }
      };

      // Add event listeners for user interactions
      const events = ["click", "touchstart", "keydown", "mousedown"];
      events.forEach((event) => {
        document.addEventListener(event, handleUserInteraction, { once: true });
      });

      return () => {
        events.forEach((event) => {
          document.removeEventListener(event, handleUserInteraction);
        });
      };
    }
  }, [isOpen, remoteStream]);

  // Handle call duration timer
  useEffect(() => {
    if (isCallActive) {
      console.log("🕐 Starting duration timer...");
      durationRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000) as unknown as number;
    }

    return () => {
      if (durationRef.current) {
        clearInterval(durationRef.current);
        durationRef.current = null;
      }
    };
  }, [isCallActive]);

  // Monitor connection status for debugging long-distance calls
  useEffect(() => {
    if (isCallActive && callData) {
      const checkConnectionStatus = () => {
        const socket = callingService.getSocket();
        if (socket) {
          setConnectionStatus(
            `Socket: ${socket.connected ? "Connected" : "Disconnected"}`
          );
        }
      };

      // Check immediately
      checkConnectionStatus();

      // Check every 5 seconds
      const statusInterval = setInterval(checkConnectionStatus, 5000);

      return () => clearInterval(statusInterval);
    }
  }, [isCallActive, callData]);

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
      console.log("🎵 CallDialog: Call ended:", data);
      setIsCallActive(false);
      setCallDuration(0);
      setLocalStream(null);
      setRemoteStream(null);
      setRemoteScreenShareStream(null);
      setIsScreenSharing(false);

      // Reset audio setup flag for next call
      audioSetupComplete.current = false;
      console.log("🔊 Audio setup flag reset for next call");

      if (onCallEnded) {
        onCallEnded();
      }
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

      // CRITICAL FIX: Prevent duplicate stream assignments that cause audio interruption
      if (remoteStream && remoteStream.id === stream.id) {
        console.log(
          "🔊 Duplicate stream detected, skipping to prevent audio interruption"
        );
        return;
      }

      setRemoteStream(stream);

      // IMMEDIATE audio setup - don't wait for useEffect
      if (remoteAudioRef.current && stream && !audioSetupComplete.current) {
        console.log("🔊 IMMEDIATE AUDIO SETUP from callback");

        // Detect if this is a different device call
        const audioTracks = stream.getAudioTracks();
        const hasMutedTracks = audioTracks.some((track) => track.muted);
        const isDifferentDeviceCall = hasMutedTracks;

        console.log("🔍 DEVICE CALL ANALYSIS:", {
          totalTracks: audioTracks.length,
          hasMutedTracks,
          isDifferentDeviceCall,
          callType: isDifferentDeviceCall
            ? "Different Device (TURN relay)"
            : "Same Device (Direct)",
        });

        // Prevent multiple audio setups
        audioSetupComplete.current = true;
        console.log("�� Audio setup marked as complete IMMEDIATELY");

        // CRITICAL FIX: Stop any existing audio playback before setting new stream
        if (remoteAudioRef.current.srcObject) {
          console.log("🔊 Stopping existing audio to prevent interruption");
          remoteAudioRef.current.pause();
          remoteAudioRef.current.currentTime = 0;
        }

        // Set the new stream
        remoteAudioRef.current.srcObject = stream;

        // CRITICAL: Unmute the audio element and ensure tracks are enabled
        remoteAudioRef.current.muted = false;
        console.log("🔊 Audio element unmuted");

        // Mobile-specific audio optimizations
        remoteAudioRef.current.volume = 1.0;
        remoteAudioRef.current.playbackRate = 1.0;
        remoteAudioRef.current.preload = "auto";

        console.log("📱 Mobile audio optimizations applied");

        audioTracks.forEach((track, index) => {
          if (!track.enabled) {
            console.log(`🔊 Enabling audio track ${index} (was disabled)`);
            track.enabled = true;
          }

          // Log track state for debugging
          console.log(`🔊 Audio track ${index} state:`, {
            enabled: track.enabled,
            muted: track.muted, // This is read-only!
            readyState: track.readyState,
          });

          // Handle muted tracks for different devices
          if (track.muted) {
            console.warn(
              `⚠️ Audio track ${index} is muted (read-only property)`
            );
            console.warn(
              `⚠️ This is NORMAL for different device calls (security feature)`
            );
            console.warn(
              `⚠️ Audio should still work through the HTML audio element`
            );

            // For different devices, we need to ensure the audio element is properly configured
            if (remoteAudioRef.current) {
              // Force audio element to be unmuted and ready
              remoteAudioRef.current.muted = false;
              remoteAudioRef.current.volume = 1.0;
              remoteAudioRef.current.playbackRate = 1.0;

              console.log(
                "🔊 Audio element configured for muted track handling"
              );
              console.log("🔊 Element state:", {
                muted: remoteAudioRef.current.muted,
                volume: remoteAudioRef.current.volume,
                readyState: remoteAudioRef.current.readyState,
              });
            }
          } else {
            console.log(
              `✅ Audio track ${index} is unmuted (same device or trusted connection)`
            );
          }
        });

        // CRITICAL FIX: Wait for the stream to be ready before playing
        const startAudioPlayback = () => {
          if (remoteAudioRef.current && remoteAudioRef.current.paused) {
            console.log("🔊 Starting audio playback...");
            remoteAudioRef.current
              .play()
              .then(() => {
                console.log("✅ Remote audio started playing successfully");
                console.log("🎵 Audio element state:", {
                  paused: remoteAudioRef.current?.paused,
                  currentTime: remoteAudioRef.current?.currentTime,
                  volume: remoteAudioRef.current?.volume,
                  muted: remoteAudioRef.current?.muted,
                });
              })
              .catch((error) => {
                console.error("❌ Audio play failed:", error);
                // If autoplay fails, try again after user interaction
                console.log(
                  "🔄 Autoplay failed, will retry on user interaction"
                );
              });
          } else {
            console.log("🔊 Audio already playing, skipping play call");
          }
        };

        // Try to start playback immediately
        startAudioPlayback();

        // Special handling for different device calls
        if (isDifferentDeviceCall) {
          console.log(
            "🌐 DIFFERENT DEVICE CALL DETECTED - Special handling applied"
          );
          console.log(
            "🌐 Audio tracks are muted (security feature) but audio element is configured"
          );
          console.log(
            "🌐 Audio should work through the HTML audio element despite muted tracks"
          );

          // Additional configuration for different device calls
          if (remoteAudioRef.current) {
            // Ensure audio element is fully configured
            remoteAudioRef.current.muted = false;
            remoteAudioRef.current.volume = 1.0;
            remoteAudioRef.current.playbackRate = 1.0;

            // Force a small delay then retry play for different devices
            setTimeout(() => {
              if (remoteAudioRef.current && remoteAudioRef.current.paused) {
                console.log(
                  "🌐 Retrying audio playback for different device call..."
                );
                remoteAudioRef.current.play().catch((error) => {
                  console.error(
                    "❌ Retry audio play failed for different device:",
                    error
                  );
                });
              }
            }, 500);
          }
        } else {
          console.log("🔗 SAME DEVICE CALL - Standard audio handling applied");
        }

        console.log("🔊 Audio element updated immediately:", {
          srcObject: !!remoteAudioRef.current.srcObject,
          readyState: remoteAudioRef.current.readyState,
          paused: remoteAudioRef.current.paused,
          muted: remoteAudioRef.current.muted,
          isDifferentDeviceCall,
        });
      } else {
        console.log("🔊 Skipping audio setup:", {
          hasRef: !!remoteAudioRef.current,
          hasStream: !!stream,
          alreadySetup: audioSetupComplete.current,
          reason: audioSetupComplete.current
            ? "Already setup"
            : "Missing ref or stream",
        });
      }

      // Always handle remote stream regardless of call type
      console.log("🔄 Processing remote stream for call type:", callType);

      // Log video tracks specifically
      const videoTracks = stream.getVideoTracks();
      console.log(
        "📹 Video tracks in remote stream:",
        videoTracks.map((t) => ({
          kind: t.kind,
          enabled: t.enabled,
          muted: t.muted,
          readyState: t.readyState,
          id: t.id,
        }))
      );

      // Log ALL tracks in detail
      console.log("🎵 ALL tracks in remote stream:", {
        totalTracks: stream.getTracks().length,
        audioTracks: stream.getAudioTracks().length,
        videoTracks: videoTracks.length,
        trackDetails: stream.getTracks().map((t, index) => ({
          index,
          kind: t.kind,
          enabled: t.enabled,
          muted: t.muted,
          readyState: t.readyState,
          id: t.id,
          label: t.label,
        })),
      });

      // Log stream properties
      console.log("🎵 Stream properties:", {
        id: stream.id,
        active: stream.active,
        onaddtrack: !!stream.onaddtrack,
        onremovetrack: !!stream.onremovetrack,
      });

      // Check if this is a MediaStream object
      if (stream instanceof MediaStream) {
        console.log("✅ Stream is valid MediaStream object");
      } else {
        console.log("❌ Stream is NOT a MediaStream object:", typeof stream);
      }

      // Ensure remote video element is updated (for both video and audio calls)
      setTimeout(() => {
        if (remoteVideoRef.current && stream) {
          remoteVideoRef.current.srcObject = stream;
          console.log("✅ Remote video element updated");

          // Only try to play video if there are video tracks
          if (videoTracks.length > 0) {
            remoteVideoRef.current
              .play()
              .catch((e) => console.log("Remote video play:", e));
            // Make sure video is not hidden
            remoteVideoRef.current.style.display = "block";
            remoteVideoRef.current.style.visibility = "visible";
          }

          // Log video element properties
          console.log("📹 Video element properties:", {
            srcObject: remoteVideoRef.current.srcObject,
            readyState: remoteVideoRef.current.readyState,
            videoWidth: remoteVideoRef.current.videoWidth,
            videoHeight: remoteVideoRef.current.videoHeight,
            currentTime: remoteVideoRef.current.currentTime,
            duration: remoteVideoRef.current.duration,
            paused: remoteVideoRef.current.paused,
            ended: remoteVideoRef.current.ended,
          });
        } else {
          console.log("⚠️ Remote video ref not available:", {
            hasRef: !!remoteVideoRef.current,
            hasStream: !!stream,
            refCurrent: remoteVideoRef.current,
          });
        }
      }, 100);
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
      console.log("📹 Local stream tracks:", {
        total: localStream.getTracks().length,
        audio: localStream.getAudioTracks().length,
        video: localStream.getVideoTracks().length,
      });

      if (localStream.getVideoTracks().length > 0) {
        const videoTrack = localStream.getVideoTracks()[0];
        console.log("📹 Video track details:", {
          id: videoTrack.id,
          enabled: videoTrack.enabled,
          readyState: videoTrack.readyState,
          muted: videoTrack.muted,
        });
      }

      localVideoRef.current.srcObject = localStream;

      // Ensure video plays
      localVideoRef.current.play().catch((error) => {
        console.error("❌ Local video play failed:", error);
        console.error("❌ Video element state:", {
          readyState: localVideoRef.current?.readyState,
          videoWidth: localVideoRef.current?.videoWidth,
          videoHeight: localVideoRef.current?.videoHeight,
          paused: localVideoRef.current?.paused,
        });
      });

      // Log video element state after setting stream
      console.log("📹 Local video element state after setting stream:", {
        readyState: localVideoRef.current.readyState,
        videoWidth: localVideoRef.current.videoWidth,
        videoHeight: localVideoRef.current.videoHeight,
        paused: localVideoRef.current.paused,
        srcObject: !!localVideoRef.current.srcObject,
      });
    } else {
      console.log("❌ Cannot set local video stream:", {
        hasRef: !!localVideoRef.current,
        hasStream: !!localStream,
        ref: localVideoRef.current,
        stream: localStream,
      });
    }
  }, [localStream]);

  // Debug ref availability
  useEffect(() => {
    console.log("🔍 Video refs status:", {
      localVideoRef: !!localVideoRef.current,
      remoteVideoRef: !!remoteVideoRef.current,
      localAudioRef: !!localAudioRef.current,
      remoteAudioRef: !!remoteAudioRef.current,
      hasLocalStream: !!localStream,
      hasRemoteStream: !!remoteStream,
    });
  }, [localStream, remoteStream]);

  // Debug component mount and ref creation
  useEffect(() => {
    console.log("🎬 CallDialog mounted with refs:", {
      localVideoRef: localVideoRef.current,
      remoteVideoRef: remoteVideoRef.current,
      localAudioRef: localAudioRef.current,
      remoteAudioRef: remoteAudioRef.current,
    });
  }, []);

  // Listen for call type changes from calling service
  useEffect(() => {
    const handleCallTypeChange = (data: any) => {
      console.log("🔄 CallDialog: Call type changed:", data);
      console.log("🔄 Previous call type:", callType);
      console.log("🔄 New call type:", data.newCallType);
      console.log("🔄 Reason:", data.reason);

      // Update the call type in the calling service
      const activeCall = callingService.getActiveCall();
      if (activeCall) {
        activeCall.callData.callType = data.newCallType;
        console.log("✅ Call type updated in calling service");
      }
    };

    // Add event listener for call type changes
    const socket = callingService.getSocket();
    socket?.on("callTypeChanged", handleCallTypeChange);

    return () => {
      socket?.off("callTypeChanged", handleCallTypeChange);
    };
  }, [callingService]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      console.log("📹 Setting remote video stream:", remoteStream);
      remoteVideoRef.current.srcObject = remoteStream;
      // Ensure video plays and is visible
      remoteVideoRef.current
        .play()
        .catch((e) => console.log("Remote video play:", e));
      // Make sure video is not hidden
      remoteVideoRef.current.style.display = "block";
      remoteVideoRef.current.style.visibility = "visible";
      // Log video element state
      console.log("📹 Remote video element state:", {
        display: remoteVideoRef.current.style.display,
        visibility: remoteVideoRef.current.style.visibility,
        width: remoteVideoRef.current.videoWidth,
        height: remoteVideoRef.current.videoHeight,
        readyState: remoteVideoRef.current.readyState,
      });
    }
  }, [remoteStream]);

  // Set up remote audio stream with cross-device compatibility
  useEffect(() => {
    console.log("🔊 REMOTE STREAM EFFECT TRIGGERED:", {
      hasRemoteAudioRef: !!remoteAudioRef.current,
      hasRemoteStream: !!remoteStream,
      remoteStreamTracks: remoteStream?.getTracks().length,
      remoteStreamAudioTracks: remoteStream?.getAudioTracks().length,
      alreadySetup: audioSetupComplete.current,
    });

    // Skip if already set up or missing elements
    if (audioSetupComplete.current) {
      console.log("🔊 Audio already set up, skipping useEffect");
      return;
    }

    if (remoteAudioRef.current && remoteStream && !audioSetupComplete.current) {
      console.log("🔊 Setting remote audio stream:", remoteStream);
      remoteAudioRef.current.srcObject = remoteStream;

      // CRITICAL: Unmute the audio element and ensure tracks are enabled
      remoteAudioRef.current.muted = false;
      console.log("🔊 Audio element unmuted");

      const audioTracks = remoteStream.getAudioTracks();
      audioTracks.forEach((track, index) => {
        if (!track.enabled) {
          console.log(
            `🔊 Enabling audio track ${index} from useEffect (was disabled)`
          );
          track.enabled = true;
        }
        console.log(`🔊 Audio track ${index} state from useEffect:`, {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
        });
      });

      // Handle autoplay for cross-device calls
      const startAudio = async () => {
        try {
          if (remoteAudioRef.current && remoteAudioRef.current.paused) {
            console.log("🔊 Starting audio playback from useEffect...");

            // For cross-device calls, we need to handle autoplay restrictions
            const playPromise = remoteAudioRef.current.play();
            if (playPromise !== undefined) {
              await playPromise;
              console.log("✅ Audio started successfully");
            }
          } else {
            console.log(
              "🔊 Audio already playing from useEffect, skipping play call"
            );
          }
        } catch (error: any) {
          console.warn(
            "⚠️ Autoplay failed (common on mobile/cross-device):",
            error
          );

          // Show user-friendly message about audio
          if (error.name === "NotAllowedError") {
            console.log("📱 Mobile autoplay blocked - user needs to interact");
            // You could show a "Tap to enable audio" button here
          }
        }
      };

      // Try to start audio immediately
      startAudio();

      audioSetupComplete.current = true;
      console.log("🔊 Audio setup marked as complete from useEffect");

      console.log("🔊 Remote audio element state:", {
        readyState: remoteAudioRef.current.readyState,
        paused: remoteAudioRef.current.paused,
        muted: remoteAudioRef.current.muted,
        volume: remoteAudioRef.current.volume,
        srcObject: !!remoteAudioRef.current.srcObject,
      });
    } else {
      console.log("🔊 Skipping useEffect audio setup:", {
        hasRef: !!remoteAudioRef.current,
        hasStream: !!remoteStream,
        alreadySetup: audioSetupComplete.current,
        reason: audioSetupComplete.current
          ? "Already setup"
          : "Missing ref or stream",
      });
    }
  }, [remoteStream]);

  // Update audio elements when streams change
  useEffect(() => {
    if (localAudioRef.current && localStream) {
      localAudioRef.current.srcObject = localStream;
      localAudioRef.current.muted = true; // Mute local audio to prevent echo
    }
  }, [localStream]);

  // Check for remote screen share
  useEffect(() => {
    const checkScreenShare = () => {
      const screenShareStream = callingService.getRemoteScreenShareStream();
      if (screenShareStream && screenShareStream !== remoteScreenShareStream) {
        console.log(
          "🖥️ Remote screen share stream detected:",
          screenShareStream
        );
        setRemoteScreenShareStream(screenShareStream);
      }
    };

    // Check immediately
    checkScreenShare();

    // Check periodically
    const interval = setInterval(checkScreenShare, 1000);

    return () => clearInterval(interval);
  }, [remoteScreenShareStream]);

  // Set remote screen share video stream
  useEffect(() => {
    if (remoteScreenShareRef.current && remoteScreenShareStream) {
      console.log("🖥️ Setting remote screen share video stream");
      remoteScreenShareRef.current.srcObject = remoteScreenShareStream;
      remoteScreenShareRef.current.play().catch((error) => {
        console.error("❌ Remote screen share video play failed:", error);
      });
    }
  }, [remoteScreenShareStream]);

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
              // Ensure video plays
              localVideoRef.current
                .play()
                .catch((e) => console.log("Local video play:", e));
            }
          }, 100);
        } else if (callData.callType === "audio" && stream) {
          console.log("🎵 Audio call accepted, setting up audio elements...");
          // For audio calls, ensure audio elements are connected
          setTimeout(() => {
            if (localAudioRef.current && stream) {
              localAudioRef.current.srcObject = stream;
              console.log("✅ Local audio element connected");
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

  const handleDecline = async () => {
    console.log("🔄 CallDialog: Declining call...");

    try {
      // First emit decline call event to socket server
      if (callingService.getSocket()) {
        callingService.getSocket()?.emit("declineCall", {
          callerId: callData?.callerId,
          receiverId: callData?.receiverId,
          callType: callData?.callType,
        });
        console.log("✅ Decline call event emitted to socket server");
      }

      // Stop the ringtone
      callingService.stopRingtone();

      // Clean up any existing streams
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }

      if (remoteStream) {
        remoteStream.getTracks().forEach((track) => track.stop());
        setRemoteStream(null);
      }

      // Call the onDecline callback if provided
      if (onDecline) {
        console.log("🔄 Calling onDecline callback...");
        onDecline();
      }

      console.log("✅ Call declined successfully, closing dialog...");
      onClose();
    } catch (error) {
      console.error("❌ Error declining call:", error);
      // Still close the dialog even if there's an error
      onClose();
    }
  };

  const handleCancel = async () => {
    console.log("🔄 CallDialog: Cancelling call...");
    console.log("Current state:", { isIncoming, isCallActive, isConnecting });

    try {
      // First emit cancel call event to socket server
      if (callingService.getSocket()) {
        callingService.getSocket()?.emit("cancelCall", {
          callerId: callData?.callerId,
          receiverId: callData?.receiverId,
          callType: callData?.callType,
        });
        console.log("✅ Cancel call event emitted to socket server");
      }

      // Stop the calling sound
      callingService.stopCallRingtone();

      // Clean up call state
      if (isCallActive) {
        setIsCallActive(false);
        setCallDuration(0);
      }

      // Clean up streams
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }

      if (remoteStream) {
        remoteStream.getTracks().forEach((track) => track.stop());
        setRemoteStream(null);
      }

      // Reset screen sharing
      if (isScreenSharing) {
        callingService.stopScreenShare();
        setIsScreenSharing(false);
      }

      // Call the onCancel callback if provided
      if (onCancel) {
        console.log("🔄 Calling onCancel callback...");
        onCancel();
      } else {
        console.log("❌ onCancel callback not available");
      }

      // End the call in the calling service
      callingService.endCall();

      console.log("✅ Call cancelled successfully, closing dialog...");

      // Close the dialog after everything is cleaned up
      onClose();
    } catch (error) {
      console.error("❌ Error cancelling call:", error);
      // Still close the dialog even if there's an error
      onClose();
    }
  };

  const handleEndCall = async () => {
    console.log("🔄 CallDialog: Ending call...");

    try {
      // First emit end call event to socket server
      if (callingService.getSocket()) {
        callingService.getSocket()?.emit("endCall", {
          callerId: callData?.callerId,
          receiverId: callData?.receiverId,
          callType: callData?.callType,
        });
        console.log("✅ End call event emitted to socket server");
      }

      // End the call in the calling service
      callingService.endCall();

      // Clean up local state
      setIsCallActive(false);
      setCallDuration(0);

      // Clean up streams
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }

      if (remoteStream) {
        remoteStream.getTracks().forEach((track) => track.stop());
        setRemoteStream(null);
      }

      // Reset screen sharing
      if (isScreenSharing) {
        callingService.stopScreenShare();
        setIsScreenSharing(false);
      }

      // Call the callback to refresh call history
      if (onCallEnded) {
        onCallEnded();
      }

      if (onEndCall) onEndCall();

      console.log("✅ Call ended successfully, closing dialog...");
      onClose();
    } catch (error) {
      console.error("❌ Error ending call:", error);
      // Still close the dialog even if there's an error
      onClose();
    }
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

  // Handle screen sharing
  const handleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        console.log("🖥️ Stopping screen share...");
        callingService.stopScreenShare();
        setIsScreenSharing(false);
      } else {
        console.log("🖥️ Starting screen share...");
        const success = await callingService.startScreenShare();
        if (success) {
          setIsScreenSharing(true);
        } else {
          console.error("❌ Failed to start screen sharing");
        }
      }
    } catch (error) {
      console.error("❌ Screen share error:", error);
    }
  };

  // Handle audio test for cross-device calls
  const handleAudioTest = async () => {
    console.log("🔊 Testing audio for cross-device call...");

    if (remoteAudioRef.current && remoteStream) {
      try {
        // Ensure audio element is properly configured
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.volume = 1.0;

        // Try to play audio
        await remoteAudioRef.current.play();
        console.log("✅ Audio test successful");

        // Show success message
        alert("Audio test successful! You should hear the other person now.");
      } catch (error: any) {
        console.error("❌ Audio test failed:", error);

        if (error.name === "NotAllowedError") {
          alert(
            "Audio blocked by browser. Please check your device settings and try again."
          );
        } else {
          alert("Audio test failed. Please check your device audio settings.");
        }
      }
    } else {
      alert("No audio stream available for testing.");
    }
  };

  // Check if this is a cross-device call
  const isCrossDeviceCall = useMemo(() => {
    if (!remoteStream) return false;

    const audioTracks = remoteStream.getAudioTracks();
    // Cross-device calls often have muted tracks due to security restrictions
    return audioTracks.some((track) => track.muted);
  }, [remoteStream]);

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

          {/* Connection Status for debugging long-distance calls */}
          {isCallActive && (
            <p className="text-xs text-gray-500 mt-1">{connectionStatus}</p>
          )}

          {/* Enhanced Connection Status for Cross-Device Calls */}
          {isCallActive && (
            <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Connection Type:</span>
                  <span className="font-medium">
                    {isCrossDeviceCall ? "Cross-Device" : "Same-Network"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Audio Status:</span>
                  <span
                    className={`font-medium ${
                      remoteStream?.getAudioTracks().some((t) => t.enabled)
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {remoteStream?.getAudioTracks().some((t) => t.enabled)
                      ? "Active"
                      : "Inactive"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Stream Health:</span>
                  <span
                    className={`font-medium ${
                      remoteStream?.active ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {remoteStream?.active ? "Healthy" : "Unhealthy"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Show fallback notification if video call became audio */}
          {isCallActive &&
            callType === "video" &&
            callData?.callType === "audio" && (
              <p className="text-yellow-600 text-sm mt-1">
                ⚠️ Video unavailable, audio-only mode
              </p>
            )}

          {/* Cross-device audio notification */}
          {isCrossDeviceCall && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700 text-sm text-center mb-2">
                📱 Cross-device call detected
              </p>
              <button
                onClick={handleAudioTest}
                className="w-full bg-blue-500 text-white text-xs px-3 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                🔊 Test Audio
              </button>
              <p className="text-blue-600 text-xs text-center mt-1">
                Tap to ensure audio is working
              </p>
            </div>
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
                  muted={false}
                  className="w-full h-full object-cover"
                  style={{
                    transform: "scaleX(-1)", // Mirror the remote video
                    display: "block",
                    visibility: "visible",
                    minHeight: "128px",
                    minWidth: "100%",
                  }}
                />
                <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  {callerName}
                </div>
                {/* Show video status */}
                {!isActuallyVideoCall && (
                  <div className="absolute top-2 left-2 bg-blue-500 bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                    Audio Only
                  </div>
                )}
              </div>
            )}

            {/* Show loading state when waiting for remote video */}
            {isCallActive && !remoteStream && actualCallType === "video" && (
              <div className="mt-4 relative bg-gray-100 rounded-lg overflow-hidden h-32 flex items-center justify-center">
                <div className="text-gray-500 text-sm">
                  Waiting for video...
                </div>
              </div>
            )}

            {/* Show audio-only indicator when video call becomes audio */}
            {isCallActive &&
              remoteStream &&
              !isActuallyVideoCall &&
              actualCallType === "video" && (
                <div className="mt-4 relative bg-gray-100 rounded-lg overflow-hidden h-32 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-gray-500 text-sm mb-2">
                      Video unavailable
                    </div>
                    <div className="text-green-500 text-xs">
                      Audio call active
                    </div>
                  </div>
                </div>
              )}

            {/* Debug info for video calls */}
            {isCallActive && actualCallType === "video" && (
              <div className="mt-2 text-xs text-gray-500 text-center">
                Video Debug:{" "}
                {remoteStream
                  ? `Stream: ✅ (${
                      remoteStream.getVideoTracks().length
                    } video tracks)`
                  : "Stream: ✅"}{" "}
                | Element: {remoteVideoRef.current ? "✅" : "❌"} | Actual Call
                Type: {actualCallType} | Has Video:{" "}
                {isActuallyVideoCall ? "✅" : "❌"}
              </div>
            )}
          </div>
        )}

        {/* Screen Share Display */}
        {isScreenSharing && (
          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-blue-700 flex items-center">
                  🖥️ Screen Sharing Active
                </h4>
                <button
                  onClick={handleScreenShare}
                  className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors"
                >
                  Stop Sharing
                </button>
              </div>
              <div className="text-xs text-blue-600">
                Your screen is being shared with {callerName}
              </div>
            </div>
          </div>
        )}

        {/* Remote Screen Share Display */}
        {remoteScreenShareStream && (
          <div className="mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-green-700 flex items-center">
                  🖥️ {callerName} is sharing their screen
                </h4>
              </div>
              <div className="relative bg-gray-100 rounded-lg overflow-hidden h-48">
                <video
                  ref={remoteScreenShareRef}
                  autoPlay
                  playsInline
                  muted={false}
                  className="w-full h-full object-contain"
                  style={{ backgroundColor: "#000" }}
                />
              </div>
            </div>
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
          {actualCallType === "video" && isActuallyVideoCall && (
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

          {/* Screen Share Button */}
          <button
            onClick={handleScreenShare}
            className={`p-4 rounded-full transition-colors duration-200 ${
              isScreenSharing
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            title={isScreenSharing ? "Stop sharing" : "Share screen"}
          >
            <IoDesktop size={24} />
          </button>

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

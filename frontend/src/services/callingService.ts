import { Socket } from "socket.io-client";
import socketManager from "./socketManager";
import axios from "axios";
import { getApiUrl } from "../config/config";

export interface CallData {
  callId: string;
  callerId: string;
  receiverId: string;
  callType: "audio" | "video";
  callerName: string;
  callerAvatar?: string;
  status: "ringing" | "active" | "ended";
}

export interface WebRTCCall {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerConnection: RTCPeerConnection | null;
  callData: CallData;
}

class CallingService {
  private socket: Socket | null = null;
  private activeCall: WebRTCCall | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private callStartTime: number | null = null;

  // Sound management for different call scenarios
  private callingSound: HTMLAudioElement | null = null;
  private ringingSound: HTMLAudioElement | null = null;
  private currentPlayingSound: HTMLAudioElement | null = null;
  private pendingOffer: any = null; // Queue for offers received before peer connection is ready
  private pendingIceCandidates: RTCIceCandidate[] = []; // Buffer ICE candidates until remote description is set
  private sentIceCandidates: Set<string> = new Set(); // Track sent ICE candidates to prevent duplicates
  private eventCounts = { callAccepted: 0, callConnected: 0 };
  private screenShareStream: MediaStream | null = null;
  private screenShareTrack: MediaStreamTrack | null = null;
  private isScreenSharing = false;
  private connectionMonitorInterval: number | null = null;

  constructor() {
    console.log("🚀 CallingService constructor called");
    console.log("🚀 Audio will be initialized lazily when needed");
    console.log("🚀 Constructor completed");
  }

  // Initialize audio lazily when first needed
  private ensureAudioInitialized() {
    if (!this.callingSound || !this.ringingSound) {
      console.log("🔊 Audio not initialized, initializing now...");
      this.initializeRingtone();
    }
  }

  // Update call record status
  private async updateCallRecord(
    callId: string,
    status: "completed" | "missed" | "rejected",
    duration?: number
  ): Promise<void> {
    try {
      // Get token from localStorage
      const authUser = localStorage.getItem("authUser");
      const token = authUser ? JSON.parse(authUser).token : null;

      if (!token) {
        console.error("No authentication token found for call update");
        return;
      }

      await axios.put(
        getApiUrl(`/api/calls/${callId}`),
        {
          status,
          duration,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Call record updated:", { callId, status, duration });
    } catch (error) {
      console.error("Error updating call record:", error);
    }
  }

  private initializeRingtone() {
    console.log("🔊 initializeRingtone called");
    // Initialize call sounds
    this.initializeCallSounds();
    console.log("🔊 initializeRingtone completed");
  }

  private initializeCallSounds() {
    try {
      console.log("🔊 Initializing call sounds...");

      // Initialize calling sound (for outgoing calls)
      this.callingSound = new Audio("/sounds/phone-calling-153844.mp3");
      console.log("🔊 Calling sound Audio object created:", this.callingSound);
      console.log("🔊 Calling sound src:", this.callingSound.src);
      console.log("🔊 Calling sound readyState:", this.callingSound.readyState);
      console.log(
        "🔊 Calling sound networkState:",
        this.callingSound.networkState
      );
      console.log(
        "🔊 Calling sound assigned to this.callingSound:",
        this.callingSound === this.callingSound
      );

      this.callingSound.loop = true;
      this.callingSound.volume = 0.7;

      // Test if the audio can load
      this.callingSound.addEventListener("canplaythrough", () => {
        console.log("✅ Calling sound loaded successfully");
        console.log(
          "✅ Calling sound readyState after load:",
          this.callingSound?.readyState
        );
      });

      this.callingSound.addEventListener("error", (e) => {
        console.error("❌ Error loading calling sound:", e);
        console.error("❌ Error details:", this.callingSound?.error);
        console.error("❌ Error code:", this.callingSound?.error?.code);
        console.error("❌ Error message:", this.callingSound?.error?.message);
      });

      // Add loadstart event
      this.callingSound.addEventListener("loadstart", () => {
        console.log("🔄 Calling sound load started");
      });

      // Add progress event
      this.callingSound.addEventListener("progress", () => {
        console.log("🔄 Calling sound loading progress");
      });

      console.log("✅ Calling sound initialized");

      // Initialize ringing sound (for incoming calls)
      this.ringingSound = new Audio("/sounds/reciever-ringing.mp3");
      console.log("🔊 Ringing sound Audio object created:", this.ringingSound);
      console.log("🔊 Ringing sound src:", this.ringingSound.src);
      console.log("🔊 Ringing sound readyState:", this.ringingSound.readyState);
      console.log(
        "🔊 Ringing sound networkState:",
        this.ringingSound.networkState
      );
      console.log(
        "🔊 Ringing sound assigned to this.ringingSound:",
        this.ringingSound === this.ringingSound
      );

      this.ringingSound.loop = true;
      this.ringingSound.volume = 0.7;

      // Test if the audio can load
      this.ringingSound.addEventListener("canplaythrough", () => {
        console.log("✅ Ringing sound loaded successfully");
        console.log(
          "✅ Ringing sound readyState after load:",
          this.ringingSound?.readyState
        );
      });

      this.ringingSound.addEventListener("error", (e) => {
        console.error("❌ Error loading ringing sound:", e);
        console.error("❌ Error details:", this.ringingSound?.error);
        console.error("❌ Error code:", this.ringingSound?.error?.code);
        console.error("❌ Error message:", this.ringingSound?.error?.message);
      });

      // Add loadstart event
      this.ringingSound.addEventListener("loadstart", () => {
        console.log("🔄 Ringing sound load started");
      });

      // Add progress event
      this.ringingSound.addEventListener("progress", () => {
        console.log("🔄 Ringing sound loading progress");
      });

      console.log("✅ Ringing sound initialized");

      console.log("🔊 Sound files loaded:", {
        calling: this.callingSound.src,
        ringing: this.ringingSound.src,
      });

      // Verify objects are not null
      console.log("🔊 Final verification:", {
        callingSoundExists: !!this.callingSound,
        ringingSoundExists: !!this.ringingSound,
        callingSoundType: typeof this.callingSound,
        ringingSoundType: typeof this.ringingSound,
      });

      // Force load the audio files
      console.log("🔄 Attempting to force load audio files...");
      this.callingSound.load();
      this.ringingSound.load();
      console.log("🔄 Audio files load() method called");

      // Final verification after load
      console.log("🔊 Final state after load:", {
        callingSoundExists: !!this.callingSound,
        ringingSoundExists: !!this.ringingSound,
        callingSoundType: typeof this.callingSound,
        ringingSoundType: typeof this.ringingSound,
        callingSoundReadyState: this.callingSound?.readyState,
        ringingSoundReadyState: this.ringingSound?.readyState,
      });
    } catch (error: any) {
      console.error("❌ CRITICAL ERROR in initializeCallSounds:", error);
      console.error("❌ Error stack:", error.stack);
    }
  }

  async setSocket(socket: Socket) {
    console.log("🔌 CALLING SERVICE: setSocket called");
    console.log("🔌 New socket ID:", socket?.id);
    console.log("🔌 New socket connected:", socket?.connected);
    console.log("🔌 Previous socket ID:", this.socket?.id);

    // Clean up previous socket listeners if they exist
    if (this.socket) {
      console.log("🔌 CALLING SERVICE: Cleaning up previous socket...");
      this.socket.off("offer");
      this.socket.off("answer");
      this.socket.off("iceCandidate");
      this.socket.off("callAccepted");
      this.socket.off("callConnected");
      this.socket.off("callEnded");
      this.socket.off("callFailed");
      this.socket.off("callDeclined");
      this.socket.off("callCancelled");
      this.socket.off("test");
      console.log("🔌 Previous socket event listeners removed");
    }

    this.socket = socket;
    console.log("🔌 CALLING SERVICE: Socket set, setting up listeners...");
    this.setupSocketListeners();

    // If we have an active call, try to restore it
    if (this.activeCall) {
      console.log(
        "Calling service: Restoring active call after socket reconnect..."
      );
      // Re-emit the call initiation to restore the call state
      if (this.socket) {
        this.socket.emit("initiateCall", {
          callerId: this.activeCall.callData.callerId,
          callerName: this.activeCall.callData.callerName,
          receiverId: this.activeCall.callData.receiverId,
          callType: this.activeCall.callData.callType,
          callerAvatar: this.activeCall.callData.callerAvatar,
        });
      }
    }
  }

  // Ensure socket connection
  private async ensureSocket(): Promise<Socket> {
    if (!this.socket || !this.socket.connected) {
      console.log("🔄 Getting socket from socket manager...");
      this.socket = socketManager.getSocket();

      if (!this.socket || !this.socket.connected) {
        console.log(
          "🔄 No socket available or not connected, creating new one..."
        );
        socketManager.connect();
        this.socket = socketManager.getSocket();
      }

      if (!this.socket) {
        throw new Error("Failed to get socket connection");
      }

      // Set up socket event listeners
      this.setupSocketListeners();
    }

    return this.socket;
  }

  private setupSocketListeners() {
    console.log("🔌 CALLING SERVICE: setupSocketListeners called");
    console.log("🔌 Socket exists:", !!this.socket);
    console.log("🔌 Socket ID:", this.socket?.id);
    console.log("🔌 Socket connected:", this.socket?.connected);
    console.log("🔌 Setting up callTypeChanged listener...");

    if (!this.socket) {
      console.log("❌ No socket available, cannot set up listeners");
      return;
    }

    // CRITICAL FIX: Remove all existing listeners first to prevent duplicates
    this.socket.off("callAccepted");
    this.socket.off("callConnected");
    this.socket.off("callEnded");
    this.socket.off("callFailed");
    this.socket.off("callDeclined");
    this.socket.off("callCancelled");
    this.socket.off("offer");
    this.socket.off("answer");
    this.socket.off("iceCandidate");
    this.socket.off("test");
    this.socket.off("callTypeChanged");
    console.log("🔌 Previous event listeners removed");

    // Handle call accepted (ONLY for the caller)
    this.socket.on("callAccepted", (data) => {
      this.eventCounts.callAccepted++;
      console.log("=== CALLING SERVICE: callAccepted (CALLER ONLY) ===");
      console.log("Call accepted data:", data);
      console.log("🔄 Current active call:", this.activeCall);
      console.log("🔄 Current user ID:", this.getCurrentUserId());
      console.log("🔄 Event received by user:", this.getCurrentUserId());
      console.log("🔄 Event data callerId:", data.callerId);
      console.log("🔄 Event data receiverId:", data.receiverId);
      console.log("🔄 Socket ID:", this.socket?.id);
      console.log(
        "🔌 Socket ready state:",
        this.socket?.connected ? "connected" : "disconnected"
      );
      console.log(
        "🔄 Event count - callAccepted:",
        this.eventCounts.callAccepted
      );

      // CRITICAL FIX: Enhanced duplicate event detection and prevention
      if (this.eventCounts.callAccepted > 1) {
        console.log("🚨 WARNING: callAccepted event received multiple times!");
        console.log(
          "🚨 This suggests event duplication or wrong event routing!"
        );
        console.log("🚨 Event count:", this.eventCounts.callAccepted);

        // CRITICAL FIX: Don't process duplicate events and reset the connection
        if (this.eventCounts.callAccepted > 3) {
          console.log("🚨 Too many duplicate events, resetting connection...");
          this.eventCounts.callAccepted = 0;
          this.cleanupCall();
          return;
        }

        // For 2-3 events, just ignore them
        return;
      }

      // Only process this if we're actually the caller
      if (
        this.activeCall &&
        this.activeCall.callData.callerId === this.getCurrentUserId()
      ) {
        console.log("✅ We are the caller, processing callAccepted event");

        // CRITICAL FIX: Preserve the original call type from the active call
        const originalCallType = this.activeCall.callData.callType;
        console.log("✅ Original call type preserved:", originalCallType);

        if (this.activeCall) {
          this.activeCall.callData.status = "active";
          this.callStartTime = Date.now();
          console.log("✅ Call status updated to active");
          console.log("✅ Call start time set:", this.callStartTime);
        }

        console.log(
          "🔄 We're the caller, sending WebRTC offer after call accepted..."
        );
        console.log(
          "🔄 Active call caller ID:",
          this.activeCall.callData.callerId
        );
        console.log("🔄 Current user ID:", this.getCurrentUserId());

        // Small delay to ensure receiver is ready
        setTimeout(async () => {
          console.log("🔄 Timeout fired, creating and sending offer...");
          await this.createAndSendOffer();
        }, 500);
      } else {
        console.log("❌ Ignoring callAccepted event - we are NOT the caller:");
        console.log("  - Has active call:", !!this.activeCall);
        console.log(
          "  - Active call caller ID:",
          this.activeCall?.callData.callerId
        );
        console.log("  - Current user ID:", this.getCurrentUserId());
        console.log(
          "  - Is caller:",
          this.activeCall?.callData.callerId === this.getCurrentUserId()
        );
        return; // Don't process this event if we're not the caller
      }

      this.onCallConnected?.(data);
    });

    // Handle call connected (ONLY for the receiver)
    this.socket.on("callConnected", (data) => {
      this.eventCounts.callConnected++;
      console.log("=== CALLING SERVICE: callConnected (RECEIVER ONLY) ===");
      console.log("Call connected data:", data);
      console.log("🔄 Event received by user:", this.getCurrentUserId());
      console.log("🔄 Event data callerId:", data.callerId);
      console.log("🔄 Event data receiverId:", data.receiverId);
      console.log(
        "🔄 Event count - callConnected:",
        this.eventCounts.callConnected
      );

      // Only process this if we're actually the receiver
      if (
        this.activeCall &&
        this.activeCall.callData.receiverId === this.getCurrentUserId()
      ) {
        console.log("✅ We are the receiver, processing callConnected event");

        if (this.activeCall) {
          this.activeCall.callData.status = "active";
          this.callStartTime = Date.now();
          console.log("✅ Call status updated to active");
          console.log("✅ Call start time set:", this.callStartTime);
        }

        console.log(
          "🔄 We're the receiver, waiting for WebRTC offer from caller..."
        );
      } else {
        console.log(
          "❌ Ignoring callConnected event - we are NOT the receiver:"
        );
        console.log("  - Has active call:", !!this.activeCall);
        console.log(
          "  - Active call receiver ID:",
          this.activeCall?.callData.receiverId
        );
        console.log("  - Current user ID:", this.getCurrentUserId());
        console.log(
          "  - Is receiver:",
          this.activeCall?.callData.receiverId === this.getCurrentUserId()
        );
        return; // Don't process this event if we're not the receiver
      }

      this.onCallConnected?.(data);
    });

    // Handle call declined
    this.socket.on("callDeclined", (data) => {
      console.log("=== CALLING SERVICE: callDeclined ===");
      console.log("Call declined data:", data);

      this.stopCallRingtone();
      this.cleanupCall();
      this.onCallEnded?.(data);
    });

    // Handle call cancelled
    this.socket.on("callCancelled", (data) => {
      console.log("=== CALLING SERVICE: callCancelled ===");
      console.log("Call cancelled data:", data);

      this.stopCallRingtone();
      this.cleanupCall();
      this.onCallEnded?.(data);
    });

    // Test event listener to verify socket is working
    this.socket.on("test", (data) => {
      console.log("🧪 TEST EVENT RECEIVED:", data);
      console.log("🧪 Socket ID:", this.socket?.id);
      console.log("🧪 Current user ID:", this.getCurrentUserId());
    });

    // Log socket connection status
    console.log("🔌 CALLING SERVICE: Socket event listeners set up");
    console.log("🔌 Socket ID:", this.socket?.id);
    console.log("🔌 Socket connected:", this.socket?.connected);
    console.log(
      "🔌 Socket ready state:",
      this.socket?.connected ? "connected" : "disconnected"
    );
    console.log("🔌 Current user ID:", this.getCurrentUserId());
    console.log(
      "🔌 Socket event listeners registered for: offer, answer, iceCandidate, callAccepted, callConnected, callEnded, callFailed, callDeclined, callCancelled, test"
    );

    // Handle WebRTC offer
    this.socket.on("offer", async (data) => {
      console.log("🎯 OFFER RECEIVED");

      if (data.receiverId !== this.getCurrentUserId()) {
        console.log("❌ Offer not for us, ignoring.");
        return;
      }

      // The ONLY job here is to queue the offer.
      // The actual processing happens in handleAcceptCall.
      this.pendingOffer = data;
      console.log("⏳ Offer has been queued, waiting for user to accept.");
    });

    // Handle WebRTC answer
    this.socket.on("answer", async (data) => {
      console.log("🎯 CALLING SERVICE: Received answer:", data);
      console.log("🎯 Answer data:", {
        hasAnswer: !!data.answer,
        hasSenderId: !!data.senderId,
        receiverId: data.receiverId,
        answerType: data.answer?.type,
        answerSdp: data.answer?.sdp?.substring(0, 100) + "...",
      });

      // Check if we're ready to handle the answer
      if (
        !this.peerConnection ||
        this.peerConnection.signalingState !== "have-local-offer"
      ) {
        console.log("⏳ Not ready for answer, waiting for peer connection...");
        // Store the answer data to process later when ready
        setTimeout(() => this.handleAnswer(data), 1000);
        return;
      }

      await this.handleAnswer(data);
    });

    // Handle ICE candidates
    this.socket.on("iceCandidate", (data) => {
      console.log("🧊 === FRONTEND ICE CANDIDATE RECEIVED ===");
      console.log("🧊 SOCKET: ICE candidate received:", data);
      console.log("🧊 SOCKET: ICE candidate details:", {
        hasCandidate: !!data.candidate,
        candidateType: data.candidate?.type,
        candidateProtocol: data.candidate?.protocol,
        senderId: data.senderId,
        receiverId: data.receiverId,
        callId: data.callId,
        timestamp: data.timestamp,
        isCrossDevice: data.isCrossDevice,
      });

      // Enhanced logging for debugging
      console.log("🧊 FRONTEND: ICE candidate data analysis:", {
        candidateExists: !!data.candidate,
        candidateType: typeof data.candidate,
        candidateKeys: data.candidate ? Object.keys(data.candidate) : [],
        candidateString: data.candidate?.candidate,
        sdpMid: data.candidate?.sdpMid,
        sdpMLineIndex: data.candidate?.sdpMLineIndex,
        timestamp: new Date().toISOString(),
      });

      // Process the ICE candidate
      this.handleIceCandidate(data);
      console.log("🧊 === END FRONTEND ICE CANDIDATE PROCESSING ===");
    });

    // Handle call ended
    this.socket.on("callEnded", (data) => {
      console.log("=== CALLING SERVICE: callEnded ===");
      console.log("Call ended data:", data);

      this.stopRingtone();
      this.stopCallRingtone();
      this.cleanupCall();
      this.onCallEnded?.(data);
    });

    // Handle call type change (e.g., video -> audio fallback)
    console.log("🎧 Setting up callTypeChanged event listener...");
    this.socket.on("callTypeChanged", (data) => {
      console.log("🔄 CALLING SERVICE: Call type changed:", data);
      console.log(
        "🔄 Current active call:",
        this.activeCall
          ? {
              callId: this.activeCall.callData.callId,
              callType: this.activeCall.callData.callType,
            }
          : "No active call"
      );

      if (this.activeCall && this.activeCall.callData.callId === data.callId) {
        this.activeCall.callData.callType = data.newCallType;
        console.log(`🔄 Call type updated to: ${data.newCallType}`);
        console.log(`🔄 Reason: ${data.reason}`);

        // Also update the remote stream to reflect the new call type
        if (this.remoteStream && data.newCallType === "audio") {
          console.log("🔄 Updating remote stream to audio-only mode");
          // Remove video tracks from remote stream
          const videoTracks = this.remoteStream.getVideoTracks();
          videoTracks.forEach((track) => {
            console.log("🔄 Stopping video track:", track.id);
            track.stop();
          });
        }
      } else {
        console.log("❌ Call type change not applied:", {
          hasActiveCall: !!this.activeCall,
          activeCallId: this.activeCall?.callData.callId,
          eventCallId: data.callId,
          callIdsMatch: this.activeCall?.callData.callId === data.callId,
        });
      }
    });

    // Handle call failed
    this.socket.on("callFailed", (data) => {
      console.log("Call failed:", data);
      this.stopCallRingtone();
      this.onCallFailed?.(data);
    });
  }

  // Callback functions that components can set
  onCallConnected?: (data: any) => void;
  onCallEnded?: (data: any) => void;
  onCallFailed?: (data: any) => void;
  onRemoteStream?: (stream: MediaStream) => void;

  public async initiateCall(
    receiverId: string,
    callType: "audio" | "video"
  ): Promise<void> {
    console.log("=== CALLING SERVICE: initiateCall ===");
    console.log("📞 Initiating call to:", receiverId);
    console.log("📞 Call type:", callType);

    // Clean up any existing call first
    this.cleanupCall();

    // Reset event counts
    this.eventCounts.callAccepted = 0;
    this.eventCounts.callConnected = 0;

    try {
      // Ensure socket connection
      await this.ensureSocket();

      // Get user media
      const constraints = {
        audio: true,
        video: callType === "video",
      };

      console.log("🔄 Requesting media with constraints:", constraints);
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("✅ Media stream obtained:", this.localStream);

      // Create call data
      const callData: CallData = {
        callerId: this.getCurrentUserId()!,
        receiverId,
        callType,
        callerName: this.getCurrentUserName() || "Unknown User",
        status: "ringing",
        callId: this.generateCallId(),
      };

      // Create peer connection for caller
      console.log("🔄 Creating peer connection for caller...");
      this.createPeerConnection(callData);
      console.log("✅ Peer connection created");

      // Set active call
      this.activeCall = {
        localStream: this.localStream,
        remoteStream: this.remoteStream,
        peerConnection: this.peerConnection,
        callData,
      };

      // Send call request
      if (this.socket) {
        this.socket.emit("initiateCall", {
          receiverId,
          callerId: this.getCurrentUserId(),
          callType,
          callId: callData.callId,
          callerName: this.getCurrentUserName() || "Unknown User",
          callerAvatar: "/profile.jpg",
        });
        console.log("✅ Call request sent");
      } else {
        throw new Error("Socket not available");
      }
    } catch (error) {
      console.error("❌ Error initiating call:", error);
      this.cleanupCall();
      throw error;
    }
  }

  public async acceptCall(callData: CallData): Promise<void> {
    console.log("=== CALLING SERVICE: acceptCall ===");
    console.log("📞 Accepting call with data:", callData);

    // Clean up any existing call first
    this.cleanupCall();

    // Reset event counts
    this.eventCounts.callAccepted = 0;
    this.eventCounts.callConnected = 0;

    try {
      // Use the new handleAcceptCall method
      await this.handleAcceptCall(callData);
      console.log("✅ Call accepted successfully");
    } catch (error) {
      console.error("❌ Error accepting call:", error);
      this.cleanupCall();
    }
  }

  async declineCall(callData: CallData) {
    try {
      const socket = await this.ensureSocket();

      console.log("🔄 Declining call:", callData);

      socket.emit("cancelCall", {
        callerId: callData.callerId,
        receiverId: callData.receiverId,
        callType: callData.callType,
      });

      // Also emit endCall to ensure cleanup
      socket.emit("endCall", {
        callerId: callData.callerId,
        receiverId: callData.receiverId,
        callType: callData.callType,
      });
    } catch (error) {
      console.error("Error declining call:", error);
    }
    this.stopRingtone();
    this.cleanupCall();
  }

  async endCall() {
    try {
      if (this.activeCall) {
        const socket = await this.ensureSocket();

        // Determine the other user ID correctly
        const currentUserId = this.activeCall.callData.callerId;
        const otherUserId = this.activeCall.callData.receiverId;

        console.log("Ending call:", {
          currentUserId,
          otherUserId,
          callType: this.activeCall.callData.callType,
        });

        socket.emit("endCall", {
          callerId: currentUserId,
          receiverId: otherUserId,
          callType: this.activeCall.callData.callType,
        });

        // Update call record in backend
        if (this.activeCall.callData.callId) {
          // Calculate actual call duration if call was active
          let duration: number | undefined;
          if (
            this.activeCall.callData.status === "active" &&
            this.callStartTime
          ) {
            duration = Math.floor((Date.now() - this.callStartTime) / 1000); // Duration in seconds
            console.log(`✅ Call duration calculated: ${duration} seconds`);
          }

          await this.updateCallRecord(
            this.activeCall.callData.callId,
            "completed",
            duration
          );
        }
      }
    } catch (error) {
      console.error("Error ending call:", error);
    }
    this.stopRingtone();
    this.stopCallRingtone();
    this.cleanupCall();
  }

  private createPeerConnection(callData: CallData): RTCPeerConnection {
    console.log("🔄 Creating new RTCPeerConnection...");

    // ✅ --- CRITICAL FIX #1: ADD STUN SERVERS --- ✅
    const configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        // Add TURN servers here for production applications
      ],
    };

    this.peerConnection = new RTCPeerConnection(configuration);

    // Add local stream tracks to the connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });
    }

    // Handle incoming remote stream
    this.peerConnection.ontrack = (event) => {
      console.log("✅ Remote track received!");
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.onRemoteStream?.(this.remoteStream); // Notify UI to attach the stream
      }
    };

    // Handle ICE candidate generation
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("🧊 New ICE candidate generated, sending to peer...");
        this.socket?.emit("iceCandidate", {
          receiverId: this.getOtherUserId(callData),
          candidate: event.candidate,
          senderId: callData.callerId, // Ensure senderId is included
          callId: callData.callId,
        });
      }
    };

    return this.peerConnection;
  }

  private async handleOffer(data: any) {
    try {
      console.log("🔄 === FRONTEND: HANDLE OFFER STARTED ===");
      console.log("🔄 handleOffer called with data:", data);
      console.log("🔄 Offer details:", {
        hasOffer: !!data.offer,
        offerType: data.offer?.type,
        offerSdp: data.offer?.sdp?.substring(0, 100) + "...",
        senderId: data.senderId,
        receiverId: data.receiverId,
        timestamp: data.timestamp,
      });

      if (!this.peerConnection) {
        console.error("❌ No peer connection available in handleOffer");
        console.log(
          "🔄 === FRONTEND: HANDLE OFFER FAILED (NO PEER CONNECTION) ==="
        );
        return;
      }

      console.log("🔄 Peer connection state before offer:", {
        connectionState: this.peerConnection.connectionState,
        iceConnectionState: this.peerConnection.iceConnectionState,
        iceGatheringState: this.peerConnection.iceGatheringState,
        signalingState: this.peerConnection.signalingState,
        hasLocalDescription: !!this.peerConnection.localDescription,
        hasRemoteDescription: !!this.peerConnection.remoteDescription,
      });

      // Set the remote description (offer from caller)
      console.log("🔄 Setting remote description...");
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.offer)
      );
      console.log("✅ Remote description (offer) set");

      // CRITICAL FIX: Process any buffered ICE candidates now that remote description is set
      console.log(
        "📦 Processing buffered ICE candidates after remote description set..."
      );
      await this.processBufferedIceCandidates();

      // Create answer
      console.log("🔄 Creating answer...");
      const answer = await this.peerConnection.createAnswer();
      console.log("✅ Answer created:", answer);

      console.log("🔄 Setting local description...");
      await this.peerConnection.setLocalDescription(answer);
      console.log("✅ Answer set as local description");

      console.log("🔄 Peer connection state after answer:", {
        connectionState: this.peerConnection.connectionState,
        iceConnectionState: this.peerConnection.iceConnectionState,
        iceGatheringState: this.peerConnection.iceGatheringState,
        signalingState: this.peerConnection.signalingState,
      });

      // Send answer back to the caller
      if (this.socket && data.senderId) {
        console.log("🔄 Sending answer to caller:", data.senderId);
        this.socket.emit("answer", {
          answer,
          receiverId: data.senderId,
        });
        console.log("✅ Answer sent to caller:", data.senderId);
      } else {
        console.error("❌ Cannot send answer: missing socket or senderId");
      }

      console.log("🔄 === FRONTEND: HANDLE OFFER COMPLETED SUCCESSFULLY ===");
    } catch (error: any) {
      console.error("❌ Error handling offer:", error);
      console.error("❌ Error details:", error.message, error.stack);
      console.log("🔄 === FRONTEND: HANDLE OFFER FAILED WITH ERROR ===");
    }
  }

  private async handleAnswer(data: any) {
    try {
      console.log("🔄 handleAnswer called with data:", data);

      // Ensure peer connection exists
      if (!this.peerConnection) {
        console.error("❌ No peer connection available in handleAnswer");
        return;
      }

      console.log("🔄 Peer connection state before answer:", {
        connectionState: this.peerConnection.connectionState,
        iceConnectionState: this.peerConnection.iceConnectionState,
        iceGatheringState: this.peerConnection.iceGatheringState,
        signalingState: this.peerConnection.signalingState,
      });

      // Check if we're in the correct state to receive an answer
      if (this.peerConnection.signalingState !== "have-local-offer") {
        console.error(
          `❌ Wrong signaling state for answer: ${this.peerConnection.signalingState}`
        );
        console.error(
          "❌ Expected: have-local-offer, Got:",
          this.peerConnection.signalingState
        );

        // If we're in stable state, we might need to recreate the connection
        if (this.peerConnection.signalingState === "stable") {
          console.log(
            "🔄 Connection is in stable state, recreating peer connection..."
          );
          await this.recreatePeerConnection();
          return;
        }

        // For other states, wait a bit and try again
        console.log("⏳ Waiting for correct signaling state...");
        setTimeout(() => this.handleAnswer(data), 1000);
        return;
      }

      // Set the remote description (answer from receiver)
      console.log("🔄 Setting remote description (answer)...");

      // Analyze the answer SDP before setting it
      console.log("🔍 ANSWER SDP ANALYSIS:", {
        sdpType: data.answer.type,
        hasVideo: data.answer.sdp.includes("m=video"),
        hasAudio: data.answer.sdp.includes("m=audio"),
        videoLines: data.answer.sdp
          .split("\n")
          .filter((line: string) => line.startsWith("m=video")),
        audioLines: data.answer.sdp
          .split("\n")
          .filter((line: string) => line.startsWith("m=audio")),
        fullSdp: data.answer.sdp,
      });

      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.answer)
      );

      console.log("✅ Answer set as remote description");
      console.log("🎉 WebRTC connection established! Audio should now work.");

      // CRITICAL FIX: Process any buffered ICE candidates now that remote description is set
      console.log(
        "📦 Processing buffered ICE candidates after remote description set..."
      );
      await this.processBufferedIceCandidates();

      // CRITICAL FIX: Force ICE restart if connection is stuck in "new" state
      if (this.peerConnection.iceConnectionState === "new") {
        console.log(
          "🔄 ICE connection stuck in 'new' state, forcing restart..."
        );
        try {
          await this.peerConnection.restartIce();
          console.log("✅ ICE restart initiated to resolve stuck connection");
        } catch (restartError) {
          console.warn("⚠️ ICE restart failed:", restartError);
        }
      }

      // CRITICAL FIX: Force connection establishment after answer is set
      console.log("🔄 Forcing connection establishment after answer...");

      // Only create data channel if we're the caller (to avoid errors on receiver side)
      if (this.activeCall?.callData.callerId === this.getCurrentUserId()) {
        try {
          // Create a dummy data channel to force ICE connection (caller only)
          const dataChannel =
            this.peerConnection.createDataChannel("force-connection");
          dataChannel.onopen = () => {
            console.log("✅ Data channel opened, forcing ICE connection...");
            // Close the data channel immediately
            dataChannel.close();
          };
          console.log(
            "✅ Data channel created to force ICE connection (caller side)"
          );
        } catch (error) {
          console.warn("⚠️ Could not create data channel:", error);
        }
      } else {
        console.log("🔄 Skipping data channel creation (receiver side)");
      }

      // Debug: Check what tracks are available after setting remote description
      console.log("🎵 After setting remote description:");
      console.log(
        "🎵 Local tracks:",
        this.localStream?.getTracks().length || 0
      );
      console.log(
        "🎵 Remote tracks:",
        this.remoteStream?.getTracks().length || 0
      );
      console.log(
        "🎵 Peer connection state:",
        this.peerConnection.connectionState
      );
      console.log(
        "🎵 ICE connection state:",
        this.peerConnection.iceConnectionState
      );

      console.log("🔄 Peer connection state after answer:", {
        connectionState: this.peerConnection.connectionState,
        iceConnectionState: this.peerConnection.iceConnectionState,
        iceGatheringState: this.peerConnection.iceGatheringState,
        signalingState: this.peerConnection.signalingState,
      });

      // Notify that the call is fully connected
      if (this.onCallConnected) {
        this.onCallConnected(data);
      }
    } catch (error: any) {
      console.error("❌ Error handling answer:", error);
      console.error("❌ Error details:", error.message, error.stack);

      // If it's a state error, try to recover
      if (
        error.message.includes("wrong state") ||
        error.message.includes("stable")
      ) {
        console.log("🔄 Attempting to recover from state error...");
        await this.recreatePeerConnection();
      }
    }
  }

  private async processBufferedIceCandidates() {
    if (this.pendingIceCandidates.length === 0) {
      return;
    }

    console.log(
      "📦 Processing buffered ICE candidates:",
      this.pendingIceCandidates.length
    );

    const candidatesToProcess = [...this.pendingIceCandidates];
    this.pendingIceCandidates = [];

    for (const iceCandidate of candidatesToProcess) {
      try {
        console.log("🧊 Processing buffered ICE candidate:", iceCandidate);
        await this.peerConnection!.addIceCandidate(iceCandidate);
        console.log("✅ Buffered ICE candidate added successfully");
      } catch (error) {
        console.error("❌ Error processing buffered ICE candidate:", error);
      }
    }
  }

  private async handleIceCandidate(data: any) {
    console.log("🧊 HANDLING ICE CANDIDATE:", data);
    console.log("🧊 Candidate data:", {
      hasCandidate: !!data.candidate,
      candidateType: data.candidate?.type,
      candidateProtocol: data.candidate?.protocol,
      candidateAddress: data.candidate?.address,
      candidatePort: data.candidate?.port,
      senderId: data.senderId,
      receiverId: data.receiverId,
      callId: data.callId,
    });

    try {
      if (!this.peerConnection) {
        console.error("❌ No peer connection available for ICE candidate");
        return;
      }

      // Create a new RTCIceCandidate with proper error handling
      let iceCandidate: RTCIceCandidate;
      try {
        iceCandidate = new RTCIceCandidate(data.candidate);
        console.log("🧊 ICE candidate created successfully:", {
          type: iceCandidate.type,
          protocol: iceCandidate.protocol,
          address: iceCandidate.address,
          port: iceCandidate.port,
        });
      } catch (candidateError) {
        console.warn("⚠️ Invalid ICE candidate format:", candidateError);
        return;
      }

      // CRITICAL FIX: Check if remote description is set before adding ICE candidate
      if (!this.peerConnection.remoteDescription) {
        console.log(
          "⏳ Remote description not set yet, buffering ICE candidate..."
        );
        this.pendingIceCandidates.push(iceCandidate);
        console.log(
          "📦 Buffered ICE candidates count:",
          this.pendingIceCandidates.length
        );
        return;
      }

      // Add the ICE candidate to the peer connection
      console.log("🧊 Adding ICE candidate to peer connection...");
      await this.peerConnection.addIceCandidate(iceCandidate);
      console.log("✅ ICE candidate added to peer connection");

      // Log current connection states after adding candidate
      console.log("🧊 After adding ICE candidate:");
      console.log(
        "🧊 ICE connection state:",
        this.peerConnection.iceConnectionState
      );
      console.log("🧊 Connection state:", this.peerConnection.connectionState);
      console.log("🧊 Signaling state:", this.peerConnection.signalingState);

      // CRITICAL FIX: Check if connection is stuck and needs intervention
      if (
        this.peerConnection.iceConnectionState === "new" &&
        this.peerConnection.connectionState === "new"
      ) {
        console.log(
          "⚠️ Connection appears stuck in 'new' state after ICE candidate"
        );

        // Wait a bit to see if it progresses naturally
        setTimeout(() => {
          if (
            this.peerConnection &&
            this.peerConnection.iceConnectionState === "new" &&
            this.peerConnection.connectionState === "new"
          ) {
            console.log("🚨 Connection still stuck, attempting ICE restart...");
            try {
              this.peerConnection.restartIce();
              console.log(
                "✅ ICE restart initiated to resolve stuck connection"
              );
            } catch (restartError) {
              console.warn("⚠️ ICE restart failed:", restartError);
            }
          }
        }, 2000); // Wait 2 seconds before intervention
      }

      // Process any buffered ICE candidates
      this.processBufferedIceCandidates();
    } catch (error) {
      // Log the error but don't crash the connection
      if (
        error instanceof DOMException &&
        error.message.includes("Unknown ufrag")
      ) {
        console.warn(
          "⚠️ ICE candidate from different session, skipping:",
          error.message
        );
      } else {
        console.error("❌ Error handling ICE candidate:", error);

        // CRITICAL FIX: If ICE candidate handling fails repeatedly, try to recover
        if (
          this.peerConnection &&
          this.peerConnection.iceConnectionState === "failed"
        ) {
          console.log(
            "🔄 ICE connection failed, attempting to recreate peer connection..."
          );
          await this.recreatePeerConnection();
        }
      }
    }
  }

  startRingtone() {
    console.log("🔔 Starting ringtone for incoming call...");

    // Ensure audio is initialized
    this.ensureAudioInitialized();

    console.log("🔔 Ringing sound object:", this.ringingSound);
    console.log("🔔 Ringing sound readyState:", this.ringingSound?.readyState);

    // Stop any currently playing sound
    this.stopAllSounds();

    // Use ringing sound for incoming calls
    if (this.ringingSound) {
      this.currentPlayingSound = this.ringingSound;
      console.log("🔔 Attempting to play ringing sound...");
      this.ringingSound
        .play()
        .then(() => {
          console.log("✅ Ringing sound started successfully");
        })
        .catch((error) => {
          console.error("❌ Error playing ringing sound:", error);
        });
    } else {
      console.error("❌ No ringing sound available!");
    }
  }

  // Start calling sound for outgoing calls
  startCallingSound() {
    console.log("🔔 Starting calling sound for outgoing call...");

    // Ensure audio is initialized
    this.ensureAudioInitialized();

    console.log("🔔 Calling sound object:", this.callingSound);
    console.log("🔔 Calling sound readyState:", this.callingSound?.readyState);

    // Stop any currently playing sound
    this.stopAllSounds();

    // Use calling sound for outgoing calls
    if (this.callingSound) {
      this.currentPlayingSound = this.callingSound;
      console.log("🔔 Attempting to play calling sound...");
      this.callingSound
        .play()
        .then(() => {
          console.log("✅ Calling sound started successfully");
        })
        .catch((error) => {
          console.error("❌ Error playing calling sound:", error);
        });
    } else {
      console.error("❌ No calling sound available!");
    }
  }

  stopRingtone() {
    // Stop all sounds
    this.stopAllSounds();
  }

  // Stop all sounds (calling and ringing)
  stopAllSounds() {
    console.log("🔇 Stopping all sounds...");

    // Stop calling sound
    if (this.callingSound) {
      this.callingSound.pause();
      this.callingSound.currentTime = 0;
    }

    // Stop ringing sound
    if (this.ringingSound) {
      this.ringingSound.pause();
      this.ringingSound.currentTime = 0;
    }

    // Reset current playing sound
    this.currentPlayingSound = null;
    console.log("🔇 All sounds stopped");
  }

  startCallRingtone() {
    // Use calling sound for outgoing calls
    this.startCallingSound();
  }

  stopCallRingtone() {
    // Stop all sounds
    this.stopAllSounds();
  }

  // Get current call state
  getCurrentCall(): WebRTCCall | null {
    return this.activeCall;
  }

  // Get socket instance

  // Get local stream
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  // Get remote stream
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  // Check if call is active
  isCallActive(): boolean {
    return this.activeCall?.callData.status === "active";
  }

  // Debug getter for socket
  get socketStatus() {
    return !!this.socket;
  }

  // Debug method to check socket server state
  async debugSocketServer() {
    try {
      if (!this.socket) {
        console.log("❌ No socket available for debug");
        return;
      }

      console.log("🔍 DEBUG: Requesting socket server state...");
      this.socket.emit("debug");

      // Listen for debug response
      this.socket.once("debugResponse", (data) => {
        console.log("🔍 DEBUG RESPONSE RECEIVED:", data);
        console.log("🔍 Active users:", data.activeUsers);
        console.log("🔍 Active calls:", data.activeCalls);
      });
    } catch (error) {
      console.error("❌ Error debugging socket server:", error);
    }
  }

  // Set ringtone volume (0.0 to 1.0)
  setRingtoneVolume(volume: number) {
    // This method is no longer used as custom ringtone is removed.
    // Keeping it for now, but it will not have an effect.
    console.log(`🔊 Ringtone volume set to: ${volume}`);
  }

  // Get current user ID from localStorage
  private getCurrentUserId(): string | null {
    const storedUser = localStorage.getItem("authUser");
    if (storedUser) {
      return JSON.parse(storedUser)._id;
    }
    return null;
  }

  // Get current user name from localStorage
  private getCurrentUserName(): string | null {
    const storedUser = localStorage.getItem("authUser");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      return user.name || user.username || null;
    }
    return null;
  }

  // Create and send WebRTC offer
  private async createAndSendOffer() {
    try {
      console.log("🔄 === FRONTEND: CREATE AND SEND OFFER STARTED ===");
      console.log("🔄 createAndSendOffer called");
      console.log("🔄 peerConnection exists:", !!this.peerConnection);
      console.log("🔄 socket exists:", !!this.socket);
      console.log("🔄 activeCall exists:", !!this.activeCall);
      console.log("🔄 Active call details:", this.activeCall);
      console.log("🔄 Current user ID:", this.getCurrentUserId());

      if (!this.peerConnection || !this.socket || !this.activeCall) {
        console.error(
          "❌ Cannot create offer: missing peer connection, socket, or active call"
        );
        console.log(
          "🔄 === FRONTEND: CREATE AND SEND OFFER FAILED (MISSING DEPENDENCIES) ==="
        );
        return;
      }

      console.log("🔄 Creating WebRTC offer...");

      // Analyze local stream before creating offer
      if (this.localStream) {
        const localTracks = this.localStream.getTracks();
        console.log("🔍 LOCAL STREAM ANALYSIS:", {
          totalTracks: localTracks.length,
          videoTracks: localTracks.filter((t) => t.kind === "video").length,
          audioTracks: localTracks.filter((t) => t.kind === "audio").length,
          trackDetails: localTracks.map((t) => ({
            kind: t.kind,
            enabled: t.enabled,
            muted: t.muted,
            readyState: t.readyState,
            id: t.id,
          })),
        });
      }

      const offer = await this.peerConnection.createOffer();
      console.log("✅ Offer created:", offer);

      // Analyze the SDP to see what tracks are included
      console.log("🔍 OFFER SDP ANALYSIS:", {
        sdpType: offer.type,
        hasVideo: offer.sdp?.includes("m=video") || false,
        hasAudio: offer.sdp?.includes("m=audio") || false,
        videoLines: offer.sdp
          ? offer.sdp
              .split("\n")
              .filter((line: string) => line.startsWith("m=video"))
          : [],
        audioLines: offer.sdp
          ? offer.sdp
              .split("\n")
              .filter((line: string) => line.startsWith("m=audio"))
          : [],
        fullSdp: offer.sdp,
      });

      await this.peerConnection.setLocalDescription(offer);
      console.log("✅ Offer set as local description");

      // Send offer to the receiver
      const offerData = {
        offer,
        receiverId: this.activeCall.callData.receiverId,
        senderId: this.getCurrentUserId(), // Add sender ID for answer routing
      };
      console.log("🔄 Sending offer data:", offerData);

      this.socket.emit("offer", offerData);
      console.log("✅ Offer emitted to socket server");

      // Also send a test event to verify the receiver is listening
      this.socket.emit("test", {
        message: "Test event from caller",
        timestamp: Date.now(),
        callerId: this.getCurrentUserId(),
        receiverId: this.activeCall.callData.receiverId,
      });
      console.log("✅ Test event emitted to socket server");

      console.log(
        "✅ Offer sent to receiver:",
        this.activeCall.callData.receiverId
      );
      console.log(
        "🔄 === FRONTEND: CREATE AND SEND OFFER COMPLETED SUCCESSFULLY ==="
      );
    } catch (error) {
      console.error("❌ Error creating and sending offer:", error);
      console.log(
        "🔄 === FRONTEND: CREATE AND SEND OFFER FAILED WITH ERROR ==="
      );
    }
  }

  // Clean up call resources
  private cleanupCall() {
    console.log("=== CALLING SERVICE: cleanupCall ===");

    // Stop connection monitoring
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
      this.connectionMonitorInterval = null;
      console.log("🔍 Connection monitoring stopped");
    }

    // CRITICAL FIX: Properly close peer connection to reset WebRTC state
    if (this.peerConnection) {
      console.log("🔄 Closing peer connection to reset WebRTC state...");

      // Close all data channels first (if any exist)
      // Note: getDataChannels() is not available in standard WebRTC API
      // Data channels are managed separately if needed

      // Close the peer connection
      this.peerConnection.close();
      this.peerConnection = null;
      console.log("✅ Peer connection closed and reset");
    }

    // CRITICAL FIX: Stop all media tracks to prevent interference
    if (this.localStream) {
      console.log("🔄 Stopping local media tracks...");
      this.localStream.getTracks().forEach((track) => {
        track.stop();
        console.log(`✅ Stopped ${track.kind} track:`, track.id);
      });
      this.localStream = null;
    }

    if (this.remoteStream) {
      console.log("🔄 Stopping remote media tracks...");
      this.remoteStream.getTracks().forEach((track) => {
        track.stop();
        console.log(`✅ Stopped ${track.kind} track:`, track.id);
      });
      this.remoteStream = null;
    }

    // Clear pending offers
    this.pendingOffer = null;
    console.log("🧹 Pending offers cleared");

    // Clear pending ICE candidates
    if (this.pendingIceCandidates.length > 0) {
      console.log(
        "🧹 Clearing pending ICE candidates:",
        this.pendingIceCandidates.length
      );
      this.pendingIceCandidates = [];
    }

    // CRITICAL FIX: Reset event counters
    this.eventCounts.callAccepted = 0;
    this.eventCounts.callConnected = 0;
    console.log("🔄 Event counters reset");

    // Clear active call
    this.activeCall = null;
    this.callStartTime = null;

    // Clear sent ICE candidates
    this.sentIceCandidates.clear();

    console.log("✅ Call resources cleaned up");
  }

  // Clean up all sound resources
  private cleanupAllSounds() {
    // Clean up MP3 sounds
    if (this.callingSound) {
      this.callingSound.pause();
      this.callingSound.currentTime = 0;
      this.callingSound = null;
    }

    if (this.ringingSound) {
      this.ringingSound.pause();
      this.ringingSound.currentTime = 0;
      this.ringingSound = null;
    }

    this.currentPlayingSound = null;
    console.log("✅ All sound resources cleaned up");
  }

  // Cleanup method to be called when component unmounts
  cleanup() {
    this.cleanupCall();
    this.cleanupAllSounds();
    this.socket = null;
  }

  // Screen sharing methods
  async startScreenShare(): Promise<boolean> {
    try {
      if (this.isScreenSharing) {
        console.log("⚠️ Screen sharing already active");
        return true;
      }

      if (!this.activeCall || !this.peerConnection) {
        console.log("❌ No active call for screen sharing");
        return false;
      }

      console.log("🖥️ Starting screen share...");

      // Request screen share with audio if possible
      const constraints = {
        video: {
          mediaSource: "screen" as any,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      };

      this.screenShareStream = await navigator.mediaDevices.getDisplayMedia(
        constraints
      );
      console.log("✅ Screen share stream obtained:", this.screenShareStream);

      // Get the video track from screen share
      const videoTracks = this.screenShareStream.getVideoTracks();
      if (videoTracks.length === 0) {
        console.log("❌ No video tracks in screen share stream");
        this.screenShareStream.getTracks().forEach((track) => track.stop());
        this.screenShareStream = null;
        return false;
      }

      this.screenShareTrack = videoTracks[0];
      console.log("✅ Screen share video track:", this.screenShareTrack);

      // Add screen share track to peer connection
      this.peerConnection.addTrack(
        this.screenShareTrack,
        this.screenShareStream
      );
      console.log("✅ Screen share track added to peer connection");

      // Listen for track ending (user stops sharing)
      this.screenShareTrack.onended = () => {
        console.log("🖥️ Screen share track ended by user");
        this.stopScreenShare();
      };

      this.isScreenSharing = true;
      console.log("✅ Screen sharing started successfully");

      // Emit screen share started event
      this.emit("screenShareStarted", { trackId: this.screenShareTrack.id });

      return true;
    } catch (error) {
      console.error("❌ Failed to start screen sharing:", error);
      this.stopScreenShare();
      return false;
    }
  }

  stopScreenShare(): void {
    if (!this.isScreenSharing) {
      return;
    }

    console.log("🖥️ Stopping screen share...");

    // Remove track from peer connection
    if (this.peerConnection && this.screenShareTrack) {
      const senders = this.peerConnection.getSenders();
      const sender = senders.find(
        (s) => s.track?.id === this.screenShareTrack?.id
      );
      if (sender) {
        this.peerConnection.removeTrack(sender);
        console.log("✅ Screen share track removed from peer connection");
      }
    }

    // Stop all tracks in screen share stream
    if (this.screenShareStream) {
      this.screenShareStream.getTracks().forEach((track) => {
        track.stop();
        console.log("✅ Screen share track stopped:", track.kind);
      });
      this.screenShareStream = null;
    }

    this.screenShareTrack = null;
    this.isScreenSharing = false;

    console.log("✅ Screen sharing stopped");

    // Emit screen share stopped event
    this.emit("screenShareStopped", {});
  }

  getScreenShareStatus(): { isSharing: boolean; hasStream: boolean } {
    return {
      isSharing: this.isScreenSharing,
      hasStream: !!this.screenShareStream,
    };
  }

  getRemoteScreenShareStream(): MediaStream | null {
    return this.screenShareStream;
  }

  // Event emitter methods for screen sharing
  private emit(event: string, data: any) {
    // Simple event emission for screen sharing status
    if (this.activeCall) {
      // You can implement a proper event system here if needed
      console.log(`📡 Screen share event: ${event}`, data);
    }
  }

  // Manually reload audio files
  reloadAudioFiles() {
    console.log("🔄 Manually reloading audio files...");

    try {
      // Dispose of old audio objects
      if (this.callingSound) {
        this.callingSound.pause();
        this.callingSound.src = "";
        this.callingSound = null;
      }

      if (this.ringingSound) {
        this.ringingSound.pause();
        this.ringingSound.src = "";
        this.ringingSound = null;
      }

      // Reinitialize
      this.initializeCallSounds();
      console.log("✅ Audio files reloaded");

      // Verify initialization
      console.log("🔊 Audio objects after reload:", {
        callingSound: !!this.callingSound,
        ringingSound: !!this.ringingSound,
      });
    } catch (error) {
      console.error("❌ Error reloading audio files:", error);
    }
  }

  // Check audio file status
  getAudioStatus() {
    // Ensure audio is initialized
    this.ensureAudioInitialized();

    return {
      callingSound: {
        exists: !!this.callingSound,
        readyState: this.callingSound?.readyState || "N/A",
        networkState: this.callingSound?.networkState || "N/A",
        src: this.callingSound?.src || "N/A",
        error: this.callingSound?.error || null,
      },
      ringingSound: {
        exists: !!this.ringingSound,
        readyState: this.ringingSound?.readyState || "N/A",
        networkState: this.ringingSound?.networkState || "N/A",
        src: this.ringingSound?.src || "N/A",
        error: this.ringingSound?.error || null,
      },
      currentPlayingSound: this.currentPlayingSound ? "Playing" : "None",
    };
  }

  // Public getter methods for external access
  public getActiveCall() {
    return this.activeCall;
  }

  public getSocket() {
    return this.socket;
  }

  // Recreate peer connection when signaling state gets corrupted
  private async recreatePeerConnection() {
    console.log("🔄 === RECREATING PEER CONNECTION ===");

    try {
      // Store current state
      const currentLocalStream = this.localStream;

      // Clean up old connection
      if (this.peerConnection) {
        console.log("🔄 Closing old peer connection...");
        this.peerConnection.close();
        this.peerConnection = null;
      }

      // Clear any pending data
      this.pendingOffer = null;
      this.pendingIceCandidates = [];
      this.sentIceCandidates.clear();

      // Create new peer connection
      console.log("🔄 Creating new peer connection...");
      this.peerConnection = this.createPeerConnection(
        this.activeCall!.callData
      );

      // Re-add local stream tracks
      if (currentLocalStream && this.peerConnection) {
        console.log("🔄 Re-adding local stream tracks...");
        currentLocalStream.getTracks().forEach((track) => {
          this.peerConnection!.addTrack(track, currentLocalStream);
        });
      }

      // Update active call with new peer connection
      if (this.activeCall) {
        this.activeCall.peerConnection = this.peerConnection;
        console.log("✅ Active call updated with new peer connection");
      }

      console.log("✅ Peer connection recreated successfully");

      // If we have a pending offer, process it now
      if (this.pendingOffer) {
        console.log("🔄 Processing pending offer with new peer connection...");
        await this.handleOffer(this.pendingOffer);
        this.pendingOffer = null;
      }
    } catch (error) {
      console.error("❌ Error recreating peer connection:", error);
      // If recreation fails, try to clean up and notify
      this.cleanupCall();
      this.onCallFailed?.({ reason: "Failed to recreate connection" });
    }
  }

  // Add this method to your CallingService class
  // This method should be called from your UI component when the user clicks "Accept"
  public async handleAcceptCall(callData: CallData) {
    console.log("✅ User accepted the call. Setting up peer connection.");

    this.activeCall = {
      callData,
      peerConnection: null,
      localStream: null,
      remoteStream: null,
    };

    try {
      // 1. Get user's microphone/camera
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callData.callType === "video",
      });

      // 2. Create the Peer Connection (this now includes the STUN fix)
      this.createPeerConnection(callData);

      // ✅ --- CRITICAL FIX #2: PROCESS THE PENDING OFFER --- ✅
      if (this.pendingOffer) {
        console.log("🔄 Processing queued offer after accepting call...");
        await this.handleOffer(this.pendingOffer);
        this.pendingOffer = null; // Clear the queued offer
      }
    } catch (error) {
      console.error("Error accepting call:", error);
      this.cleanupCall();
    }
  }

  // Helper to get the other user's ID
  private getOtherUserId(callData: CallData): string {
    const currentUserId = this.getCurrentUserId();
    return currentUserId === callData.callerId
      ? callData.receiverId
      : callData.callerId;
  }

  // Generate a unique call ID
  private generateCallId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default new CallingService();

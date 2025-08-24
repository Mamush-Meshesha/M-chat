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
  private pendingAnswer: any = null;
  private sentIceCandidates: Set<string> = new Set(); // Track sent ICE candidates to prevent duplicates
  private trackMonitorInterval: number | null = null;
  private eventCounts = { callAccepted: 0, callConnected: 0 };
  private screenShareStream: MediaStream | null = null;
  private screenShareTrack: MediaStreamTrack | null = null;
  private isScreenSharing = false;
  private connectionQualityInterval: number | null = null;

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

  // Create a call record in the backend
  private async createCallRecord(callData: {
    receiverId: string;
    type: "outgoing" | "incoming";
    callType: "audio" | "video";
  }): Promise<string | null> {
    try {
      // Get token from localStorage
      const authUser = localStorage.getItem("authUser");
      const token = authUser ? JSON.parse(authUser).token : null;

      if (!token) {
        console.error("No authentication token found for call creation");
        return null;
      }

      const response = await axios.post(
        getApiUrl("/api/calls"),
        {
          receiverId: callData.receiverId,
          type: callData.type,
          callType: callData.callType,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success || response.data._id) {
        console.log("Call record created:", response.data);
        return response.data._id || response.data.call?._id;
      } else {
        console.error("Failed to create call record:", response.data);
        return null;
      }
    } catch (error) {
      console.error("Error creating call record:", error);
      return null;
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

      // Check for event duplication
      if (this.eventCounts.callAccepted > 1) {
        console.log("🚨 WARNING: callAccepted event received multiple times!");
        console.log(
          "🚨 This suggests event duplication or wrong event routing!"
        );
      }

      // Only process this if we're actually the caller
      if (
        this.activeCall &&
        this.activeCall.callData.callerId === this.getCurrentUserId()
      ) {
        console.log("✅ We are the caller, processing callAccepted event");

        // Check for call type corruption
        if (this.activeCall.callData.callType !== "video") {
          console.log(
            "🚨 CRITICAL: Call type corrupted! Expected 'video', got:",
            this.activeCall.callData.callType
          );
          console.log("🚨 This will prevent video tracks from being sent!");
        }

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
          this.activeCall?.callData?.callerId
        );
        console.log("  - Current user ID:", this.getCurrentUserId());
        console.log(
          "  - Is caller:",
          this.activeCall?.callData?.callerId === this.getCurrentUserId()
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
          this.activeCall?.callData?.receiverId
        );
        console.log("  - Current user ID:", this.getCurrentUserId());
        console.log(
          "  - Is receiver:",
          this.activeCall?.callData?.receiverId === this.getCurrentUserId()
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
      console.log("🎯 CALLING SERVICE: Received offer:", data);
      console.log("🎯 Offer data:", {
        hasOffer: !!data.offer,
        hasSenderId: !!data.senderId,
        receiverId: data.receiverId,
        offerType: data.offer?.type,
        offerSdp: data.offer?.sdp?.substring(0, 100) + "...",
      });
      console.log("🎯 Current state before handling offer:", {
        hasPeerConnection: !!this.peerConnection,
        hasLocalStream: !!this.localStream,
        hasActiveCall: !!this.activeCall,
        peerConnectionState: this.peerConnection?.connectionState,
        peerConnectionIceState: this.peerConnection?.iceConnectionState,
      });
      console.log("🎯 Socket ID:", this.socket?.id);
      console.log("🎯 Receiver ID from offer:", data.receiverId);
      console.log("🎯 Current user ID:", this.getCurrentUserId());

      // Verify this offer is for us
      if (data.receiverId !== this.getCurrentUserId()) {
        console.log(
          "❌ Offer not for us, ignoring. Expected:",
          this.getCurrentUserId(),
          "Got:",
          data.receiverId
        );
        return;
      }

      console.log("✅ Offer is for us, processing...");

      // If peer connection is not ready, queue the offer
      if (!this.peerConnection) {
        console.log("⏳ Peer connection not ready, queuing offer...");
        this.pendingOffer = data;
        console.log(
          "⏳ Offer queued, will process when peer connection is ready"
        );
        return;
      }

      console.log("✅ Peer connection ready, processing offer immediately...");
      // Process the offer immediately if peer connection is ready
      await this.handleOffer(data);
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
        console.log("⏳ Not ready for answer, queuing it...");
        this.pendingAnswer = data;
        return;
      }

      await this.handleAnswer(data);
    });

    // Handle ICE candidates
    this.socket.on("iceCandidate", async (data) => {
      console.log("🎯 CALLING SERVICE: Received ICE candidate:", data);
      console.log("🎯 ICE data:", {
        hasCandidate: !!data.candidate,
        hasSenderId: !!data.senderId,
        receiverId: data.receiverId,
      });
      console.log("🎯 Current peer connection state:", {
        hasPeerConnection: !!this.peerConnection,
        connectionState: this.peerConnection?.connectionState,
        iceConnectionState: this.peerConnection?.iceConnectionState,
      });

      // Only process ICE candidates if we have a peer connection and the candidate is valid
      if (this.peerConnection && data.candidate && data.candidate.candidate) {
        // Check if this ICE candidate is from the current session
        if (this.isValidIceCandidate(data.candidate)) {
          await this.handleIceCandidate(data);
        } else {
          console.log(
            "⚠️ Skipping ICE candidate from different session:",
            data.candidate
          );
        }
      }
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

  async initiateCall(
    callData: Omit<CallData, "callId" | "status">
  ): Promise<boolean> {
    console.log("=== CALLING SERVICE: initiateCall ===");
    console.log("Call data received:", callData);

    try {
      // Ensure we have a valid socket connection
      await this.ensureSocket();
      console.log("✅ Socket available, proceeding with media access...");

      // Get user media
      const constraints = {
        audio: true,
        video: callData.callType === "video",
      };

      console.log("Requesting media with constraints:", constraints);
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("✅ Media stream obtained:", this.localStream);

      // Create peer connection for caller
      console.log("🔄 Creating peer connection for caller...");
      this.peerConnection = this.createPeerConnection();
      console.log("✅ Peer connection created");

      // Add local stream tracks to peer connection
      console.log("🎵 Adding local tracks to peer connection:");
      this.localStream.getTracks().forEach((track, index) => {
        console.log(`🎵 Adding track ${index}:`, {
          kind: track.kind,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          id: track.id,
          label: track.label,
        });
        this.peerConnection!.addTrack(track, this.localStream!);
      });

      // Create call record in backend
      console.log("Creating call record in backend...");
      const callRecordId = await this.createCallRecord({
        receiverId: callData.receiverId,
        type: "outgoing",
        callType: callData.callType,
      });
      console.log("✅ Call record created:", callRecordId);

      // Set active call
      const callId =
        callRecordId ||
        `${callData.callerId}-${callData.receiverId}-${Date.now()}`;

      this.activeCall = {
        localStream: this.localStream,
        remoteStream: this.remoteStream,
        peerConnection: this.peerConnection,
        callData: {
          ...callData,
          callId,
          status: "ringing",
        },
      };

      console.log("✅ Active call set:", this.activeCall);

      // Save call data to localStorage for recovery
      try {
        localStorage.setItem(
          "lastInitiatedCall",
          JSON.stringify({
            ...callData,
            callId,
            status: "ringing",
          })
        );
        console.log("✅ Call data saved to localStorage for recovery");
      } catch (error) {
        console.warn("⚠️ Could not save call data to localStorage:", error);
      }

      // Emit initiateCall event to socket server
      console.log("Emitting initiateCall to socket server...");
      if (this.socket) {
        this.socket.emit("initiateCall", {
          callerId: callData.callerId,
          receiverId: callData.receiverId,
          callType: callData.callType,
          callId: callId,
        });
      }

      console.log("✅ initiateCall event emitted to socket server");

      // Start call ringtone for outgoing calls
      this.startCallRingtone();

      // Note: WebRTC offer will be sent after the receiver accepts the call
      console.log("🔄 Call initiated, waiting for receiver to accept...");

      return true;
    } catch (error) {
      console.error("❌ Error in initiateCall:", error);
      this.cleanupCall();
      return false;
    }
  }

  async acceptCall(callData: CallData): Promise<boolean> {
    try {
      console.log("🔄 CALLING SERVICE: acceptCall called");
      console.log("🔄 Call data received:", callData);
      console.log("🔄 Current user ID:", this.getCurrentUserId());
      console.log("🔄 Current socket ID:", this.socket?.id);

      // Ensure we have a valid socket connection
      await this.ensureSocket();

      // Get user media with specific constraints for localhost testing
      const constraints = {
        audio: {
          echoCancellation: false, // Disable echo cancellation for localhost testing
          noiseSuppression: false, // Disable noise suppression
          autoGainControl: false, // Disable auto gain control
        },
        video:
          callData.callType === "video"
            ? {
                width: { ideal: 1280, min: 640 },
                height: { ideal: 720, min: 480 },
                frameRate: { ideal: 30, min: 15 },
              }
            : false,
      };

      console.log("🔄 Requesting media with constraints:", constraints);
      console.log("🔄 Call type for media request:", callData.callType);
      console.log("🔄 Will request video:", callData.callType === "video");
      console.log("🔄 User role in call:", {
        currentUserId: this.getCurrentUserId(),
        callerId: callData.callerId,
        receiverId: callData.receiverId,
        isReceiver: callData.receiverId === this.getCurrentUserId(),
        isCaller: callData.callerId === this.getCurrentUserId(),
      });

      try {
        this.localStream = await navigator.mediaDevices.getUserMedia(
          constraints
        );
        console.log("✅ Media stream obtained:", this.localStream);
        console.log(
          "🎵 Audio tracks:",
          this.localStream.getAudioTracks().map((t) => ({
            kind: t.kind,
            enabled: t.enabled,
            muted: t.muted,
            readyState: t.readyState,
          }))
        );

        if (callData.callType === "video") {
          console.log(
            "📹 Video tracks:",
            this.localStream.getVideoTracks().map((t) => ({
              kind: t.kind,
              enabled: t.enabled,
              muted: t.muted,
              readyState: t.readyState,
              width: t.getSettings().width,
              height: t.getSettings().height,
              frameRate: t.getSettings().frameRate,
            }))
          );
        }
      } catch (videoError: any) {
        console.error("❌ Video access failed:", videoError);
        console.error("❌ Video error name:", videoError.name);
        console.error("❌ Video error message:", videoError.message);
        console.error("❌ Video error details:", {
          name: videoError.name,
          message: videoError.message,
          stack: videoError.stack,
        });

        // Check if it's a camera conflict error
        if (
          videoError.name === "NotAllowedError" ||
          videoError.name === "PermissionDeniedError" ||
          videoError.message.includes("Permission denied") ||
          videoError.message.includes("camera") ||
          videoError.message.includes("already in use")
        ) {
          console.log("🚨 CAMERA CONFLICT DETECTED!");
          console.log("🚨 This often happens when testing on same computer");
          console.log(
            "🚨 Try: different browsers, incognito mode, or different devices"
          );

          // Wait a bit and retry with audio-only
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        if (callData.callType === "video") {
          console.log("🚨 CRITICAL: Video access failed on video call!");
          console.log("🚨 User role:", this.getCurrentUserId());
          console.log("🚨 Call data:", callData);

          // Try to get just audio first
          try {
            const audioConstraints = {
              audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
              },
              video: false,
            };

            this.localStream = await navigator.mediaDevices.getUserMedia(
              audioConstraints
            );
            console.log("✅ Audio-only stream obtained as fallback");
            console.log(
              "✅ Audio tracks:",
              this.localStream.getAudioTracks().length
            );

            // Now try to add video separately with more permissive constraints
            try {
              console.log(
                "🔄 Attempting to add video with relaxed constraints..."
              );
              const relaxedVideoConstraints = {
                video: {
                  width: { ideal: 640, min: 320 },
                  height: { ideal: 480, min: 240 },
                  frameRate: { ideal: 15, min: 10 },
                },
              };

              const videoOnlyStream = await navigator.mediaDevices.getUserMedia(
                relaxedVideoConstraints
              );
              const videoTracks = videoOnlyStream.getVideoTracks();

              if (videoTracks.length > 0) {
                console.log("✅ Video track obtained separately!");
                videoTracks.forEach((track) => {
                  if (this.localStream) {
                    this.localStream.addTrack(track);
                    console.log(
                      "✅ Video track added to existing audio stream"
                    );
                  }
                });
              }
            } catch (separateVideoError: any) {
              console.log(
                "⚠️ Separate video access also failed:",
                separateVideoError.message
              );
              console.log("🔄 Continuing with audio-only...");
            }
          } catch (audioError) {
            console.error("❌ Both video and audio access failed:", audioError);
            throw new Error("Cannot access microphone or camera");
          }
        } else {
          // Re-throw the original error for audio calls
          throw videoError;
        }
      }

      // Create peer connection
      this.peerConnection = this.createPeerConnection();

      // Add local stream tracks to peer connection
      console.log("🎵 Adding tracks to peer connection:");
      console.log(
        "🎵 Total tracks in local stream:",
        this.localStream.getTracks().length
      );
      console.log("🎵 Audio tracks:", this.localStream.getAudioTracks().length);
      console.log("🎵 Video tracks:", this.localStream.getVideoTracks().length);

      this.localStream.getTracks().forEach((track, index) => {
        if (this.localStream && this.peerConnection) {
          console.log(`🎵 Adding track ${index}:`, {
            kind: track.kind,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
            id: track.id,
            label: track.label,
          });

          // Add event listeners to track lifecycle events
          track.addEventListener("ended", () => {
            console.log(
              `🚨 TRACK ENDED: ${track.kind} track ${track.id} ended!`
            );
            console.log("🚨 Track state:", {
              kind: track.kind,
              enabled: track.enabled,
              muted: track.muted,
              readyState: track.readyState,
            });
          });

          track.addEventListener("mute", () => {
            console.log(
              `🔇 TRACK MUTED: ${track.kind} track ${track.id} muted!`
            );
          });

          track.addEventListener("unmute", () => {
            console.log(
              `🔊 TRACK UNMUTED: ${track.kind} track ${track.id} unmuted!`
            );
          });

          // Monitor track removal from stream
          const originalRemoveTrack = this.localStream.removeTrack.bind(
            this.localStream
          );
          this.localStream.removeTrack = (trackToRemove) => {
            console.log(
              `🚨 TRACK REMOVED FROM STREAM: ${trackToRemove.kind} track ${trackToRemove.id}`
            );
            console.log("🚨 Removal stack trace:", new Error().stack);
            return originalRemoveTrack(trackToRemove);
          };

          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Debug caller's local video setup
      if (callData.callerId === this.getCurrentUserId()) {
        console.log("🎯 CALLER DEBUG: Setting up local video display");
        console.log("🎯 Local stream has tracks:", {
          total: this.localStream.getTracks().length,
          audio: this.localStream.getAudioTracks().length,
          video: this.localStream.getVideoTracks().length,
        });

        if (this.localStream.getVideoTracks().length > 0) {
          const videoTrack = this.localStream.getVideoTracks()[0];
          console.log("🎯 Video track details:", {
            id: videoTrack.id,
            enabled: videoTrack.enabled,
            readyState: videoTrack.readyState,
            muted: videoTrack.muted,
          });
        }
      }

      // Set active call
      this.activeCall = {
        localStream: this.localStream,
        remoteStream: this.remoteStream,
        peerConnection: this.peerConnection,
        callData,
      };

      console.log("✅ Call accepted successfully in calling service");
      console.log("✅ Local stream:", !!this.localStream);
      console.log("✅ Peer connection:", !!this.activeCall);
      console.log("✅ Active call set:", !!this.activeCall);

      // If we're the caller, create and send the offer
      if (callData.callerId !== this.getCurrentUserId()) {
        console.log("🔄 We're the receiver, waiting for offer from caller...");

        // Check if we have a pending offer to process
        if (this.pendingOffer) {
          console.log(
            "🔄 Processing pending offer after peer connection created..."
          );
          await this.processPendingOffer();
        }
      } else {
        console.log("🔄 We're the caller, creating and sending offer...");
        await this.createAndSendOffer();
      }

      return true;
    } catch (error) {
      console.error("Failed to accept call:", error);
      this.cleanupCall();
      return false;
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

  private createPeerConnection(): RTCPeerConnection {
    const configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
        // TURN servers for relay when direct connection fails
        {
          urls: "turn:openrelay.metered.ca:80",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
        {
          urls: "turn:openrelay.metered.ca:443",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
        {
          urls: "turn:openrelay.metered.ca:443?transport=tcp",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
      ],
      iceCandidatePoolSize: 10,
      iceTransportPolicy: "all" as RTCIceTransportPolicy, // Allow both UDP and TCP
    };

    console.log("🔄 Creating peer connection with config:", configuration);
    const pc = new RTCPeerConnection(configuration);

    // Monitor peer connection state changes
    pc.addEventListener("connectionstatechange", () => {
      console.log("🔄 PEER CONNECTION STATE CHANGE:", {
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        iceGatheringState: pc.iceGatheringState,
        signalingState: pc.signalingState,
      });
    });

    pc.addEventListener("iceconnectionstatechange", () => {
      console.log("🧊 ICE CONNECTION STATE CHANGE:", pc.iceConnectionState);

      // Log detailed ICE connection information for debugging
      if (pc.iceConnectionState === "failed") {
        console.error(
          "❌ ICE connection failed - this often happens with long-distance calls"
        );
        console.error(
          "❌ Possible causes: firewall, NAT, or network restrictions"
        );
        console.error("❌ TURN servers should help with relay");
      } else if (pc.iceConnectionState === "disconnected") {
        console.warn(
          "⚠️ ICE connection disconnected - connection may be unstable"
        );
      } else if (pc.iceConnectionState === "connected") {
        console.log("✅ ICE connection established successfully");
      }
    });

    pc.addEventListener("signalingstatechange", () => {
      console.log("📡 SIGNALING STATE CHANGE:", pc.signalingState);
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      console.log("🔄 ICE candidate generated:", event.candidate);
      if (event.candidate && this.socket && this.activeCall) {
        // Only send valid ICE candidates
        if (this.isValidIceCandidate(event.candidate)) {
          this.sendIceCandidate(event.candidate);
        } else {
          console.log("⚠️ Skipping invalid ICE candidate:", event.candidate);
        }
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log("🎵 ONTRACK EVENT FIRED!");
      console.log("🎵 Event streams:", event.streams);
      console.log("🎵 Event track:", event.track);
      console.log("🎵 Track kind:", event.track.kind);
      console.log("🎵 Track enabled:", event.track.enabled);
      console.log("🎵 Track readyState:", event.track.readyState);
      console.log(
        "🎵 Current user role:",
        this.activeCall ? "caller" : "receiver"
      );
      console.log("🎵 Peer connection state:", pc.connectionState);
      console.log("🎵 ICE connection state:", pc.iceConnectionState);
      console.log("🎵 Call ID:", this.activeCall?.callData?.callId);
      console.log("🎵 Call type:", this.activeCall?.callData?.callType);

      // Simple audio debugging
      console.log("🔊 AUDIO DEBUG:");
      console.log("🔊 Has remote stream:", !!event.streams[0]);
      console.log(
        "🔊 Stream track count:",
        event.streams[0]?.getTracks().length
      );
      console.log(
        "🔊 Audio tracks:",
        event.streams[0]?.getAudioTracks().length
      );
      console.log(
        "🔊 Video tracks:",
        event.streams[0]?.getVideoTracks().length
      );

      this.remoteStream = event.streams[0];
      console.log("🎵 Remote stream set:", this.remoteStream);
      console.log(
        "🎵 Remote stream tracks:",
        this.remoteStream?.getTracks().length
      );

      // Log all tracks in the received stream
      if (event.streams && event.streams.length > 0) {
        const stream = event.streams[0];
        console.log("🎵 Received stream tracks:", {
          totalTracks: stream.getTracks().length,
          audioTracks: stream.getAudioTracks().length,
          videoTracks: stream.getVideoTracks().length,
          trackDetails: stream.getTracks().map((t, i) => ({
            index: i,
            kind: t.kind,
            enabled: t.enabled,
            muted: t.muted,
            readyState: t.readyState,
            id: t.id,
            label: t.label,
          })),
        });

        // Check each track for screen share indicators
        stream.getTracks().forEach((track, index) => {
          console.log(`🔍 Track ${index} analysis:`, {
            kind: track.kind,
            label: track.label,
            id: track.id,
            isScreenShare:
              track.label?.toLowerCase().includes("screen") ||
              track.label?.toLowerCase().includes("display") ||
              track.label?.toLowerCase().includes("capture"),
            hasScreenKeywords: track.label?.toLowerCase().includes("screen"),
            hasDisplayKeywords: track.label?.toLowerCase().includes("display"),
            hasCaptureKeywords: track.label?.toLowerCase().includes("capture"),
          });
        });
      }

      // Check if this is a screen share track
      const trackLabel = event.track.label || "";
      const isScreenShare =
        trackLabel.toLowerCase().includes("screen") ||
        trackLabel.toLowerCase().includes("display") ||
        trackLabel.toLowerCase().includes("capture") ||
        trackLabel.toLowerCase().includes("monitor") ||
        trackLabel.toLowerCase().includes("window") ||
        trackLabel.toLowerCase().includes("tab");

      console.log("🔍 Screen share detection:", {
        trackLabel,
        isScreenShare,
        kind: event.track.kind,
        id: event.track.id,
        hasScreen: trackLabel.toLowerCase().includes("screen"),
        hasDisplay: trackLabel.toLowerCase().includes("display"),
        hasCapture: trackLabel.toLowerCase().includes("capture"),
        hasMonitor: trackLabel.toLowerCase().includes("monitor"),
        hasWindow: trackLabel.toLowerCase().includes("window"),
        hasTab: trackLabel.toLowerCase().includes("tab"),
      });

      if (event.track.kind === "video" && isScreenShare) {
        console.log("🖥️ SCREEN SHARE TRACK RECEIVED!");
        console.log("🖥️ Track label:", trackLabel);
        console.log("🖥️ Track ID:", event.track.id);

        // Create a new stream for screen share or add to existing remote stream
        if (event.streams && event.streams.length > 0) {
          this.screenShareStream = event.streams[0];
          console.log(
            "✅ Screen share stream received:",
            this.screenShareStream
          );
        } else {
          // Create a new stream for the screen share track
          this.screenShareStream = new MediaStream([event.track]);
          console.log("✅ Screen share stream created from track");
        }

        // Emit screen share received event
        this.emit("screenShareReceived", {
          stream: this.screenShareStream,
          trackId: event.track.id,
        });
      }

      // Debug: Check if this is the first time we're setting the remote stream
      if (!this.remoteStream) {
        console.log(
          "🎵 This is the FIRST ontrack event - setting up remote stream"
        );
      } else {
        console.log(
          "🎵 This is an ADDITIONAL ontrack event - updating existing stream"
        );
      }

      this.onRemoteStream?.(this.remoteStream);

      // Start monitoring connection quality for debugging long-distance calls
      this.startConnectionQualityMonitoring(pc);

      // Simple check: is the remote stream actually working?
      setTimeout(() => {
        if (this.remoteStream) {
          const audioTracks = this.remoteStream.getAudioTracks();
          console.log("🔊 AFTER 2 SECONDS - AUDIO CHECK:");
          console.log("🔊 Remote stream exists:", !!this.remoteStream);
          console.log("🔊 Audio tracks:", audioTracks.length);
          audioTracks.forEach((track, i) => {
            console.log(`🔊 Audio track ${i}:`, {
              enabled: track.enabled,
              muted: track.muted,
              readyState: track.readyState,
              id: track.id,
            });
          });
        } else {
          console.log("❌ No remote stream after 2 seconds!");
        }
      }, 2000);
    };

    // Add connection state change logging
    pc.onconnectionstatechange = () => {
      console.log("🔄 Peer connection state changed:", pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log("🔄 ICE connection state changed:", pc.iceConnectionState);
    };

    pc.onsignalingstatechange = () => {
      console.log("🔄 Signaling state changed:", pc.signalingState);
    };

    // Set up comprehensive WebRTC state monitoring
    const comprehensiveMonitor = setInterval(() => {
      if (this.localStream) {
        const tracks = this.localStream.getTracks();
        const videoTracks = this.localStream.getVideoTracks();
        const audioTracks = this.localStream.getAudioTracks();

        console.log("📊 COMPREHENSIVE MONITOR:", {
          timestamp: new Date().toISOString(),
          localStream: {
            id: this.localStream.id,
            active: this.localStream.active,
            trackCount: tracks.length,
            videoTracks: videoTracks.length,
            audioTracks: audioTracks.length,
          },
          peerConnection: {
            connectionState: pc.connectionState,
            iceConnectionState: pc.iceConnectionState,
            iceGatheringState: pc.iceGatheringState,
            signalingState: pc.signalingState,
            localDescription: pc.localDescription?.type,
            remoteDescription: pc.remoteDescription?.type,
          },
          activeCall: {
            exists: !!this.activeCall,
            callType: this.activeCall?.callData?.callType,
            status: this.activeCall?.callData?.status,
            callerId: this.activeCall?.callData?.callerId,
            receiverId: this.activeCall?.callData?.receiverId,
          },
          remoteStream: {
            exists: !!this.remoteStream,
            trackCount: this.remoteStream?.getTracks().length || 0,
            videoTracks: this.remoteStream?.getVideoTracks().length || 0,
            audioTracks: this.remoteStream?.getAudioTracks().length || 0,
          },
          screenShare: {
            isSharing: this.isScreenSharing,
            hasRemoteStream: !!this.screenShareStream,
            remoteTrackCount: this.screenShareStream?.getTracks().length || 0,
          },
          socketStatus: {
            hasSocket: !!this.socket,
            isConnected: this.socket?.connected || false,
            socketId: this.socket?.id || null,
            connectionState: this.socket?.connected
              ? "connected"
              : "disconnected",
            socketManagerStatus: socketManager.getSocketStatus(),
          },
          eventCounts: this.eventCounts,
          currentUserId: this.getCurrentUserId(),
        });

        // Alert on critical issues
        if (
          videoTracks.length === 0 &&
          this.activeCall?.callData?.callType === "video"
        ) {
          console.log("🚨 CRITICAL: Video tracks disappeared on video call!");
          console.log("🚨 Full state dump:", {
            localStream: this.localStream,
            peerConnection: pc,
            activeCall: this.activeCall,
            remoteStream: this.remoteStream,
          });
        }
      }
    }, 1000); // Check every second for more granular monitoring

    // Store the interval ID so we can clear it later
    this.trackMonitorInterval = comprehensiveMonitor as unknown as number;

    console.log("✅ Peer connection created with event handlers");
    return pc;
  }

  private async handleOffer(data: any) {
    try {
      console.log("🔄 handleOffer called with data:", data);

      if (!this.peerConnection) {
        console.error("❌ No peer connection available in handleOffer");
        return;
      }

      console.log("🔄 Peer connection state before offer:", {
        connectionState: this.peerConnection.connectionState,
        iceConnectionState: this.peerConnection.iceConnectionState,
        iceGatheringState: this.peerConnection.iceGatheringState,
        signalingState: this.peerConnection.signalingState,
      });

      // Set the remote description (offer from caller)
      console.log("🔄 Setting remote description...");
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.offer)
      );
      console.log("✅ Remote description (offer) set");

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
    } catch (error: any) {
      console.error("❌ Error handling offer:", error);
      console.error("❌ Error details:", error.message, error.stack);
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

  private isValidIceCandidate = (candidate: RTCIceCandidate): boolean => {
    // Check if the candidate has valid properties
    if (!candidate || !candidate.candidate) {
      return false;
    }

    // Check if the candidate is from the current session
    // This helps prevent "Unknown ufrag" errors from stale candidates
    if (this.peerConnection) {
      const currentState = this.peerConnection.connectionState;
      const iceState = this.peerConnection.iceConnectionState;

      // Only accept candidates when the connection is in a valid state
      if (currentState === "closed" || currentState === "failed") {
        return false;
      }

      // Skip candidates that might be from a previous session
      if (iceState === "closed" || iceState === "failed") {
        return false;
      }

      // Additional validation for ICE candidates
      if (candidate.candidate === "") {
        // This is the end-of-candidates marker, always accept it
        return true;
      }

      // Check if the candidate has a valid foundation
      if (!candidate.foundation || candidate.foundation === "null") {
        return false;
      }
    }

    return true;
  };

  private async handleIceCandidate(data: any) {
    try {
      if (!this.peerConnection) return;

      console.log("🔄 Handling ICE candidate:", data);

      // Create a new RTCIceCandidate with proper error handling
      let iceCandidate: RTCIceCandidate;
      try {
        iceCandidate = new RTCIceCandidate(data.candidate);
      } catch (candidateError) {
        console.warn("⚠️ Invalid ICE candidate format:", candidateError);
        return;
      }

      // Add the ICE candidate to the peer connection
      await this.peerConnection.addIceCandidate(iceCandidate);
      console.log("✅ ICE candidate added to peer connection");
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
      }
    }
  }

  private sendIceCandidate(candidate: RTCIceCandidate) {
    if (this.socket && this.activeCall) {
      // Prevent sending duplicate ICE candidates
      const candidateKey = `${candidate.candidate}-${candidate.sdpMid}-${candidate.sdpMLineIndex}`;

      if (!this.sentIceCandidates.has(candidateKey)) {
        this.sentIceCandidates.add(candidateKey);

        this.socket.emit("iceCandidate", {
          candidate: candidate,
          receiverId: this.activeCall.callData.receiverId,
          senderId: this.getCurrentUserId(),
        });

        console.log("🔄 ICE candidate sent:", candidateKey);
      } else {
        console.log("⚠️ Skipping duplicate ICE candidate:", candidateKey);
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

  // Set ringtone volume (0.0 to 1.0)
  setRingtoneVolume(volume: number) {
    // This method is no longer used as custom ringtone is removed.
    // Keeping it for now, but it will not have an effect.
    console.log(`🔊 Ringtone volume set to: ${volume}`);
  }

  // Get current user ID from localStorage
  private getCurrentUserId(): string | null {
    try {
      const authUser = localStorage.getItem("authUser");
      if (authUser) {
        const user = JSON.parse(authUser);
        return user._id || null;
      }
      return null;
    } catch (error) {
      console.error("Error getting current user ID:", error);
      return null;
    }
  }

  // Create and send WebRTC offer
  private async createAndSendOffer() {
    try {
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

      // Also send a test event to verify the receiver is listening
      this.socket.emit("test", {
        message: "Test event from caller",
        timestamp: Date.now(),
        callerId: this.getCurrentUserId(),
        receiverId: this.activeCall.callData.receiverId,
      });

      console.log(
        "✅ Offer sent to receiver:",
        this.activeCall.callData.receiverId
      );
    } catch (error) {
      console.error("❌ Error creating and sending offer:", error);
    }
  }

  // Process pending offer if available
  private async processPendingOffer() {
    if (this.pendingOffer && this.peerConnection) {
      console.log("🔄 Processing pending offer...");
      await this.handleOffer(this.pendingOffer);
      this.pendingOffer = null;
      console.log("✅ Pending offer processed and cleared");
    }
  }

  // Clean up call resources
  private cleanupCall() {
    console.log("=== CALLING SERVICE: cleanupCall ===");

    // Stop all media streams
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      this.remoteStream = null;
    }

    // Clean up screen sharing
    this.stopScreenShare();

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Clear track monitor interval
    if (this.trackMonitorInterval) {
      clearInterval(this.trackMonitorInterval);
      this.trackMonitorInterval = null;
      console.log("✅ Track monitor interval cleared");
    }

    // Reset call state
    this.activeCall = null;
    this.callStartTime = null;

    // Clear sent ICE candidates tracking
    this.sentIceCandidates.clear();

    // Clean up localStorage
    try {
      localStorage.removeItem("lastInitiatedCall");
      console.log("✅ Call data removed from localStorage");
    } catch (error) {
      console.warn("⚠️ Could not remove call data from localStorage:", error);
    }

    // Stop ringtones
    this.stopRingtone();
    this.stopCallRingtone();

    // Stop connection quality monitoring
    if (this.connectionQualityInterval) {
      clearInterval(this.connectionQualityInterval);
      this.connectionQualityInterval = null;
      console.log("🔍 Connection quality monitoring stopped");
    }

    // Clear pending offers and answers
    this.pendingOffer = null;
    this.pendingAnswer = null;
    console.log("🧹 Pending offers and answers cleared");

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

  // Start monitoring connection quality for debugging long-distance calls
  private startConnectionQualityMonitoring(pc: RTCPeerConnection) {
    if (!pc) return;

    console.log(
      "🔍 Starting connection quality monitoring for long-distance calls..."
    );

    // Monitor connection stats every 2 seconds
    const monitorInterval = setInterval(async () => {
      try {
        const stats = await pc.getStats();
        let hasAudio = false;
        let hasVideo = false;
        let audioPacketsLost = 0;
        let videoPacketsLost = 0;

        stats.forEach((report) => {
          if (report.type === "inbound-rtp" && report.mediaType === "audio") {
            hasAudio = true;
            audioPacketsLost = report.packetsLost || 0;
          }
          if (report.type === "inbound-rtp" && report.mediaType === "video") {
            hasVideo = true;
            videoPacketsLost = report.packetsLost || 0;
          }
        });

        console.log("📊 Connection Quality Stats:", {
          hasAudio,
          hasVideo,
          audioPacketsLost,
          videoPacketsLost,
          connectionState: pc.connectionState,
          iceConnectionState: pc.iceConnectionState,
          timestamp: new Date().toISOString(),
        });

        // Stop monitoring if connection is closed
        if (
          pc.connectionState === "closed" ||
          pc.connectionState === "failed"
        ) {
          clearInterval(monitorInterval);
          console.log("🔍 Connection quality monitoring stopped");
        }
      } catch (error) {
        console.error("❌ Error getting connection stats:", error);
      }
    }, 2000);

    // Store the interval ID for cleanup
    this.connectionQualityInterval = monitorInterval as unknown as number;
  }

  // Recreate peer connection when signaling state gets corrupted
  private async recreatePeerConnection() {
    try {
      console.log(
        "🔄 Recreating peer connection due to signaling state issues..."
      );

      // Clean up old connection
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      // Wait a bit for cleanup
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Create new peer connection
      this.peerConnection = this.createPeerConnection();

      // Re-add local stream if available
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          if (this.peerConnection) {
            this.peerConnection.addTrack(track, this.localStream!);
          }
        });
      }

      console.log("✅ Peer connection recreated successfully");

      // If we have a pending offer, process it now
      if (this.pendingOffer) {
        console.log("🔄 Processing pending offer with new connection...");
        await this.handleOffer(this.pendingOffer);
        this.pendingOffer = null;
      }

      // If we have a pending answer, process it now
      if (this.pendingAnswer) {
        console.log("🔄 Processing pending answer with new connection...");
        await this.handleAnswer(this.pendingAnswer);
        this.pendingAnswer = null;
      }
    } catch (error: any) {
      console.error("❌ Error recreating peer connection:", error);
    }
  }
}

export default new CallingService();

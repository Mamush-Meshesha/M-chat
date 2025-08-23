import { Socket } from "socket.io-client";
import socketManager from "./socketManager";
import axios from "axios";

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
  private ringtone: HTMLAudioElement | null = null;
  private callRingtone: HTMLAudioElement | null = null;
  private customRingtone: any = null; // Custom phone ringtone
  private callStartTime: number | null = null;
  private pendingOffer: any = null; // Queue for offers received before peer connection is ready

  constructor() {
    this.initializeRingtone();
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
        "http://localhost:5300/api/calls",
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
        `http://localhost:5300/api/calls/${callId}`,
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
    // Create custom phone ringtone using Web Audio API
    this.createPhoneRingtone();

    // Fallback to MP3 for browsers that don't support Web Audio API
    this.ringtone = new Audio("/notification.mp3");
    this.ringtone.loop = true;
    this.callRingtone = new Audio("/notification.mp3");
    this.callRingtone.loop = true;
  }

  private createPhoneRingtone() {
    try {
      // Create audio context for custom ringtone
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();

      // Create oscillator for the ringtone
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      // Connect oscillator to gain node
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Set initial frequency and type for phone-like sound
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.type = "sine";

      // Create the classic "duuud, duuuud" phone ringtone pattern
      const ringPattern = () => {
        const now = audioContext.currentTime;

        // First "duuud" (800 Hz) - longer tone
        oscillator.frequency.setValueAtTime(800, now);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05); // Quick fade in
        gainNode.gain.setValueAtTime(0.2, now + 0.25); // Hold
        gainNode.gain.linearRampToValueAtTime(0, now + 0.35); // Fade out

        // Second "duuuud" (1000 Hz) - shorter tone
        oscillator.frequency.setValueAtTime(1000, now + 0.4);
        gainNode.gain.setValueAtTime(0, now + 0.4);
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.45); // Quick fade in
        gainNode.gain.setValueAtTime(0.2, now + 0.55); // Hold
        gainNode.gain.linearRampToValueAtTime(0, now + 0.65); // Fade out

        // Pause between rings
        gainNode.gain.setValueAtTime(0, now + 0.65);
      };

      // Store the ringtone function for later use
      this.customRingtone = {
        audioContext,
        oscillator,
        gainNode,
        ringPattern,
        interval: null,
      };

      console.log("✅ Custom phone ringtone created successfully");
    } catch (error) {
      console.warn(
        "⚠️ Could not create custom ringtone, falling back to MP3:",
        error
      );
      this.customRingtone = null;
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
      this.socket.emit("initiateCall", {
        callerId: this.activeCall.callData.callerId,
        callerName: this.activeCall.callData.callerName,
        receiverId: this.activeCall.callData.receiverId,
        callType: this.activeCall.callData.callType,
        callerAvatar: this.activeCall.callData.callerAvatar,
      });
    }
  }

  // Ensure socket connection
  private async ensureSocket(): Promise<Socket> {
    if (!this.socket) {
      console.log("🔄 Getting socket from socket manager...");
      this.socket = socketManager.getSocket();

      if (!this.socket) {
        console.log("🔄 No socket available, creating new one...");
        await socketManager.createSocket();
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

    if (!this.socket) {
      console.log("❌ No socket available, cannot set up listeners");
      return;
    }

    // Handle call accepted
    this.socket.on("callAccepted", (data) => {
      console.log("=== CALLING SERVICE: callAccepted ===");
      console.log("Call accepted data:", data);
      console.log("🔄 Current active call:", this.activeCall);
      console.log("🔄 Current user ID:", this.getCurrentUserId());

      if (this.activeCall) {
        this.activeCall.callData.status = "active";
        this.callStartTime = Date.now();
        console.log("✅ Call status updated to active");
        console.log("✅ Call start time set:", this.callStartTime);
      }

      // If we're the caller, now send the WebRTC offer
      if (
        this.activeCall &&
        this.activeCall.callData.callerId === this.getCurrentUserId()
      ) {
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
        console.log("❌ Not sending offer - conditions not met:");
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

        // Try to recover by checking if we have a call in progress
        if (!this.activeCall) {
          console.log(
            "🔄 Attempting to recover active call from localStorage..."
          );
          // Try to get the last initiated call from localStorage
          const lastCall = localStorage.getItem("lastInitiatedCall");
          if (lastCall) {
            try {
              const callData = JSON.parse(lastCall);
              console.log("🔄 Found last initiated call:", callData);
              // Recreate the active call if we're the caller
              if (callData.callerId === this.getCurrentUserId()) {
                console.log("🔄 Recreating active call for caller...");
                this.activeCall = {
                  localStream: this.localStream,
                  remoteStream: this.remoteStream,
                  peerConnection: this.peerConnection,
                  callData: callData,
                };
                // Now try to send the offer
                setTimeout(async () => {
                  console.log(
                    "🔄 Recovery timeout fired, creating and sending offer..."
                  );
                  await this.createAndSendOffer();
                }, 500);
              }
            } catch (error) {
              console.error("❌ Error recovering call data:", error);
            }
          }
        }
      }

      this.onCallConnected?.(data);
    });

    // Handle call connected
    this.socket.on("callConnected", (data) => {
      console.log("=== CALLING SERVICE: callConnected ===");
      console.log("Call connected data:", data);

      if (this.activeCall) {
        this.activeCall.callData.status = "active";
        this.callStartTime = Date.now();
        console.log("✅ Call status updated to active");
        console.log("✅ Call start time set:", this.callStartTime);
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
    console.log("🔌 Socket ready state:", this.socket?.readyState);
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
      await this.handleIceCandidate(data);
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
      const socket = await this.ensureSocket();
      console.log("✅ Socket available, proceeding with media access...");

      // Get user media
      const constraints = {
        audio: true,
        video: callData.callType === "video",
      };

      console.log("Requesting media with constraints:", constraints);
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("✅ Media stream obtained:", this.localStream);

      // Create peer connection
      console.log("Creating peer connection...");
      this.peerConnection = this.createPeerConnection();
      console.log("✅ Peer connection created");

      // Add local stream tracks to peer connection
      console.log("Adding tracks to peer connection...");
      this.localStream.getTracks().forEach((track) => {
        if (this.localStream && this.peerConnection) {
          this.peerConnection.addTrack(track, this.localStream);
          console.log("✅ Added track:", track.kind);
        }
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
      socket.emit("initiateCall", {
        callerId: callData.callerId,
        receiverId: callData.receiverId,
        callType: callData.callType,
        callId: callId,
      });

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
      const socket = await this.ensureSocket();

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
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
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

      // Create peer connection
      this.peerConnection = this.createPeerConnection();

      // Add local stream tracks to peer connection
      this.localStream.getTracks().forEach((track) => {
        if (this.localStream && this.peerConnection) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

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
      ],
    };

    console.log("🔄 Creating peer connection with config:", configuration);
    const pc = new RTCPeerConnection(configuration);

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      console.log("🔄 ICE candidate generated:", event.candidate);
      if (event.candidate && this.socket && this.activeCall) {
        console.log(
          "🔄 Sending ICE candidate to receiver:",
          this.activeCall.callData.receiverId
        );
        this.socket.emit("iceCandidate", {
          candidate: event.candidate,
          receiverId: this.activeCall.callData.receiverId,
        });
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

      this.remoteStream = event.streams[0];
      console.log("🎵 Remote stream set:", this.remoteStream);
      console.log(
        "🎵 Remote stream tracks:",
        this.remoteStream?.getTracks().map((t) => ({
          kind: t.kind,
          enabled: t.enabled,
          muted: t.muted,
          readyState: t.readyState,
        }))
      );

      this.onRemoteStream?.(this.remoteStream);
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
    } catch (error) {
      console.error("❌ Error handling offer:", error);
      console.error("❌ Error details:", error.message, error.stack);
    }
  }

  private async handleAnswer(data: any) {
    try {
      console.log("🔄 handleAnswer called with data:", data);

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

      // Set the remote description (answer from receiver)
      console.log("🔄 Setting remote description (answer)...");
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.answer)
      );

      console.log("✅ Answer set as remote description");
      console.log("🎉 WebRTC connection established! Audio should now work.");

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
    } catch (error) {
      console.error("❌ Error handling answer:", error);
      console.error("❌ Error details:", error.message, error.stack);
    }
  }

  private async handleIceCandidate(data: any) {
    try {
      if (!this.peerConnection) return;

      console.log("🔄 Handling ICE candidate:", data);

      await this.peerConnection.addIceCandidate(
        new RTCIceCandidate(data.candidate)
      );

      console.log("✅ ICE candidate added to peer connection");
    } catch (error) {
      console.error("❌ Error handling ICE candidate:", error);
    }
  }

  startRingtone() {
    // Try custom ringtone first, fallback to MP3
    if (this.customRingtone) {
      try {
        this.customRingtone.oscillator.start();
        // Start the ringtone pattern immediately
        this.customRingtone.ringPattern();
        // Then repeat every 1.2 seconds (slightly longer than the pattern)
        this.customRingtone.interval = setInterval(() => {
          this.customRingtone.ringPattern();
        }, 1200);
        console.log("🔔 Custom phone ringtone started (duuud, duuuud)");
      } catch (error) {
        console.warn("⚠️ Custom ringtone failed, falling back to MP3:", error);
        this.startMP3Ringtone();
      }
    } else {
      this.startMP3Ringtone();
    }
  }

  stopRingtone() {
    // Stop custom ringtone
    if (this.customRingtone && this.customRingtone.interval) {
      clearInterval(this.customRingtone.interval);
      this.customRingtone.interval = null;
      try {
        this.customRingtone.oscillator.stop();
        this.customRingtone.oscillator =
          this.customRingtone.audioContext.createOscillator();
        this.customRingtone.oscillator.connect(this.customRingtone.gainNode);
        this.customRingtone.oscillator.frequency.setValueAtTime(
          800,
          this.customRingtone.audioContext.currentTime
        );
        this.customRingtone.oscillator.type = "sine";
        console.log("🔇 Custom ringtone stopped");
      } catch (error) {
        console.warn("⚠️ Error stopping custom ringtone:", error);
      }
    }

    // Stop MP3 ringtone
    if (this.ringtone) {
      this.ringtone.pause();
      this.ringtone.currentTime = 0;
    }
  }

  startCallRingtone() {
    // Use the same custom ringtone for outgoing calls
    this.startRingtone();
  }

  stopCallRingtone() {
    // Stop the ringtone
    this.stopRingtone();
  }

  private startMP3Ringtone() {
    if (this.ringtone) {
      this.ringtone.play().catch(console.error);
      console.log("🔔 MP3 ringtone started");
    }
  }

  // Get current call state
  getCurrentCall(): WebRTCCall | null {
    return this.activeCall;
  }

  // Get socket instance
  getSocket(): Socket | null {
    return this.socket;
  }

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

  // Test the ringtone (for debugging)
  testRingtone() {
    console.log("🧪 Testing ringtone...");
    this.startRingtone();
    setTimeout(() => {
      this.stopRingtone();
      console.log("🧪 Ringtone test completed");
    }, 3000); // Test for 3 seconds
  }

  // Test socket connection (for debugging)
  testSocketConnection() {
    console.log("🧪 Testing socket connection...");
    if (this.socket) {
      console.log("🧪 Socket exists, sending test event...");
      this.socket.emit("test", {
        message: "Socket connection test",
        timestamp: Date.now(),
        userId: this.getCurrentUserId(),
      });
      console.log("🧪 Test event sent");
    } else {
      console.log("❌ No socket available for testing");
    }
  }

  // Set ringtone volume (0.0 to 1.0)
  setRingtoneVolume(volume: number) {
    if (this.customRingtone && this.customRingtone.gainNode) {
      this.customRingtone.gainNode.gain.setValueAtTime(
        volume,
        this.customRingtone.audioContext.currentTime
      );
      console.log(`🔊 Ringtone volume set to: ${volume}`);
    }
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
      console.log(
        "🔄 Local stream tracks:",
        this.localStream
          ?.getTracks()
          .map((t) => ({ kind: t.kind, enabled: t.enabled }))
      );

      const offer = await this.peerConnection.createOffer();
      console.log("✅ Offer created:", offer);

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

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Reset call state
    this.activeCall = null;
    this.callStartTime = null;

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

    console.log("✅ Call resources cleaned up");
  }

  // Clean up custom ringtone resources
  private cleanupCustomRingtone() {
    if (this.customRingtone) {
      try {
        if (this.customRingtone.interval) {
          clearInterval(this.customRingtone.interval);
          this.customRingtone.interval = null;
        }
        if (this.customRingtone.oscillator) {
          this.customRingtone.oscillator.stop();
        }
        if (this.customRingtone.audioContext) {
          this.customRingtone.audioContext.close();
        }
        this.customRingtone = null;
        console.log("✅ Custom ringtone resources cleaned up");
      } catch (error) {
        console.warn("⚠️ Error cleaning up custom ringtone:", error);
      }
    }
  }

  // Cleanup method to be called when component unmounts
  cleanup() {
    this.cleanupCall();
    this.stopRingtone();
    this.stopCallRingtone();
    this.cleanupCustomRingtone();
    this.socket = null;
  }
}

export default new CallingService();

import { Socket } from "socket.io-client";
import socketManager from "./socketManager";
import axios from "axios";
import { getApiUrl } from "../config/config";

interface CallData {
  callerId: string;
  receiverId: string;
  callType: "audio" | "video";
  callerName?: string;
  callerAvatar?: string;
  status?: string;
  startTime?: number;
}

interface ActiveCall {
  localStream: MediaStream;
  remoteStream: MediaStream | null;
  peerConnection: RTCPeerConnection;
  callData: CallData;
}

class CallingService {
  private socket: Socket | null = null;
  private activeCall: ActiveCall | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private callingSound: HTMLAudioElement | null = null;
  private ringingSound: HTMLAudioElement | null = null;
  private pendingAudioElement: HTMLAudioElement | null = null;

  // Callbacks
  onCallConnected: ((data: any) => void) | null = null;
  onCallEnded: (() => void) | null = null;
  onCallFailed: ((error: any) => void) | null = null;
  onRemoteStream: ((stream: MediaStream) => void) | null = null;

  // Event counters for debugging
  private eventCounters = {
    callAccepted: 0,
    offer: 0,
    answer: 0,
    iceCandidate: 0,
  };

  // Pending offers for ICE restart
  private pendingOffers: any[] = [];

  setSocket(socket: Socket) {
    // Clean up existing socket listeners
    if (this.socket) {
      this.socket.off("callAccepted");
      this.socket.off("offer");
      this.socket.off("answer");
      this.socket.off("iceCandidate");
      this.socket.off("callEnded");
      this.socket.off("callFailed");
    }

    this.socket = socket;

    // Set up new socket listeners
    this.socket.on("callAccepted", (data) => this.handleCallAccepted(data));
    this.socket.on("offer", (data) => this.handleOffer(data));
    this.socket.on("answer", (data) => this.handleAnswer(data));
    this.socket.on("iceCandidate", (data) => this.handleIceCandidate(data));
    this.socket.on("callEnded", () => this.handleCallEnded());
    this.socket.on("callFailed", (error) => this.handleCallFailed(error));
  }

  async initiateCall(receiverId: string, callType: "audio" | "video"): Promise<boolean> {
    try {
      console.log("Initiating call to:", receiverId, "Type:", callType);
      
      // Clean up any existing call
      this.cleanupCall();

      // Get local media stream
      const constraints = {
        audio: true,
        video: callType === "video",
      };

      console.log("Requesting media with constraints:", constraints);
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Media stream obtained:", this.localStream);

      // Create peer connection
      console.log("Creating peer connection for caller...");
      this.peerConnection = this.createPeerConnection({
        callerId: this.socket?.id || "",
        receiverId,
        callType,
      });

      // Add local stream to peer connection
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });

      // Store call data
      this.activeCall = {
        localStream: this.localStream,
        remoteStream: null,
        peerConnection: this.peerConnection,
        callData: {
          callerId: this.socket?.id || "",
          receiverId,
          callType,
          status: "connecting",
        },
      };

      // Send call request
      if (this.socket) {
        this.socket.emit("initiateCall", {
          receiverId,
          callType,
          callerName: "User", // You can get this from your user context
          callerAvatar: "/profile.jpg", // You can get this from your user context
        });
        console.log("Call request sent");
      }

      return true;
    } catch (error) {
      console.error("Failed to initiate call:", error);
      this.cleanupCall();
      return false;
    }
  }

  private createPeerConnection(callData: CallData): RTCPeerConnection {
    console.log("Creating new RTCPeerConnection...");
    
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    };

    const peerConnection = new RTCPeerConnection(configuration);
    console.log("Peer connection created");

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      console.log("Remote track received!");
      this.remoteStream = event.streams[0];
      
      // Update active call
      if (this.activeCall) {
        this.activeCall.remoteStream = this.remoteStream;
      }

      // Notify UI
      if (this.onRemoteStream) {
        this.onRemoteStream(this.remoteStream);
      }

      console.log("Remote stream received, checking if audio setup is needed...");
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("New ICE candidate generated, sending to peer...");
        if (this.socket && this.activeCall) {
          this.socket.emit("iceCandidate", {
            candidate: event.candidate,
            receiverId: this.activeCall.callData.receiverId,
            senderId: this.activeCall.callData.callerId,
          });
        }
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log("Connection state changed:", peerConnection.connectionState);
    };

    // Handle ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      console.log("ICE connection state changed:", peerConnection.iceConnectionState);
    };

    return peerConnection;
  }

  private handleCallAccepted(data: any) {
    console.log("Call accepted data:", data);
    
    if (!this.activeCall) {
      console.error("No active call to accept");
      return;
    }

    const { callerId, receiverId, callType, receiverSocketId, callId } = data;
    const currentUserId = this.socket?.id;

    console.log("Current active call:", this.activeCall);
    console.log("Current user ID:", currentUserId);
    console.log("Event received by user:", currentUserId);
    console.log("Event data callerId:", callerId);
    console.log("Event data receiverId:", receiverId);
    console.log("Socket ID:", this.socket?.id);
    console.log("Socket ready state:", this.socket?.connected ? "connected" : "disconnected");

    // Track event count
    this.eventCounters.callAccepted++;
    console.log("Event count - callAccepted:", this.eventCounters.callAccepted);

    // Check if this event is for us
    if (callerId === currentUserId) {
      console.log("We are the caller, processing callAccepted event");
      
      // Update call status
      this.activeCall.callData.status = "active";
      this.activeCall.callData.startTime = Date.now();
      console.log("Call status updated to active");
      console.log("Call start time set:", this.activeCall.callData.startTime);

      // We're the caller, send WebRTC offer after call accepted
      console.log("We're the caller, sending WebRTC offer after call accepted...");
      console.log("Active call caller ID:", this.activeCall.callData.callerId);
      console.log("Current user ID:", currentUserId);

      // Notify UI that call is connected
      if (this.onCallConnected) {
        this.onCallConnected(data);
      }

      // Create and send offer after a short delay
      setTimeout(() => {
        this.createAndSendOffer();
      }, 1000);
    } else if (receiverId === currentUserId) {
      console.log("We are the receiver, call already accepted");
    } else {
      console.warn("Call accepted event received for different users");
    }
  }

  private async createAndSendOffer() {
    if (!this.peerConnection || !this.socket || !this.activeCall) {
      console.error("Cannot create offer: missing peer connection, socket, or active call");
      return;
    }

    try {
      console.log("Creating WebRTC offer...");
      
      // Analyze local stream
      const localTracks = this.localStream?.getTracks() || [];
      const videoTracks = localTracks.filter(track => track.kind === "video");
      const audioTracks = localTracks.filter(track => track.kind === "audio");
      
      console.log("Local stream analysis:", {
        totalTracks: localTracks.length,
        videoTracks: videoTracks.length,
        audioTracks: audioTracks.length,
        trackDetails: localTracks.map(track => ({
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState,
        })),
      });

      const offer = await this.peerConnection.createOffer();
      console.log("Offer created:", offer);

      // Analyze offer SDP
      const sdpLines = offer.sdp.split("\n");
      const videoLines = sdpLines.filter(line => line.startsWith("m=video"));
      const audioLines = sdpLines.filter(line => line.startsWith("m=audio"));
      
      console.log("Offer SDP analysis:", {
        sdpType: offer.type,
        hasVideo: videoLines.length > 0,
        hasAudio: audioLines.length > 0,
        videoLines: videoLines.length,
        audioLines: audioLines.length,
        sdpLength: offer.sdp.length,
      });

      await this.peerConnection.setLocalDescription(offer);
      console.log("Offer set as local description");

      // Send offer to receiver
      const offerData = {
        offer,
        receiverId: this.activeCall.callData.receiverId,
        senderId: this.activeCall.callData.callerId,
      };

      console.log("Sending offer data:", offerData);
      this.socket.emit("offer", offerData);
      console.log("Offer emitted to socket server");

      // Also emit a test event to verify socket communication
      this.socket.emit("test", { message: "Offer sent successfully" });
      console.log("Test event emitted to socket server");

      console.log("Offer sent to receiver:", this.activeCall.callData.receiverId);
      console.log("Offer creation and sending completed successfully");

    } catch (error) {
      console.error("Failed to create and send offer:", error);
    }
  }

  private async handleOffer(data: any) {
    try {
      const { offer, receiverId, senderId } = data;
      
      if (!this.peerConnection) {
        console.error("No peer connection to handle offer");
        return;
      }

      console.log("Received offer from:", senderId);
      console.log("Setting remote description (offer)...");

      // Set remote description
      await this.peerConnection.setRemoteDescription(offer);
      console.log("Remote description (offer) set successfully");

      // Create answer
      const answer = await this.peerConnection.createAnswer();
      console.log("Answer created successfully");

      // Set local description
      await this.peerConnection.setLocalDescription(answer);
      console.log("Local description (answer) set successfully");

      // Send answer back to caller
      if (this.socket) {
        this.socket.emit("answer", {
          answer,
          receiverId: senderId,
          senderId: receiverId,
          timestamp: Date.now(),
          isCrossDevice: true,
        });
        console.log("Answer sent to caller:", senderId);
      }

    } catch (error) {
      console.error("Failed to handle offer:", error);
    }
  }

  private async handleAnswer(data: any) {
    try {
      const { answer, receiverId, senderId, timestamp, isCrossDevice } = data;
      
      console.log("Received answer:", data);
      console.log("Answer data:", {
        hasAnswer: !!answer,
        hasSenderId: !!senderId,
        receiverId,
        answerType: answer?.type,
        answerSdp: answer?.sdp?.substring(0, 100) + "...",
      });

      if (!this.peerConnection) {
        console.error("No peer connection to handle answer");
        return;
      }

      console.log("handleAnswer called with data:", data);

      // Log peer connection state before setting answer
      console.log("Peer connection state before answer:", {
        connectionState: this.peerConnection.connectionState,
        iceConnectionState: this.peerConnection.iceConnectionState,
        iceGatheringState: this.peerConnection.iceGatheringState,
        signalingState: this.peerConnection.signalingState,
      });

      // Set remote description (answer)
      console.log("Setting remote description (answer)...");
      await this.peerConnection.setRemoteDescription(answer);
      console.log("Answer set as remote description");

      // Analyze answer SDP
      const sdpLines = answer.sdp.split("\n");
      const videoLines = sdpLines.filter(line => line.startsWith("m=video"));
      const audioLines = sdpLines.filter(line => line.startsWith("m=audio"));
      
      console.log("Answer SDP analysis:", {
        sdpType: answer.type,
        hasVideo: videoLines.length > 0,
        hasAudio: audioLines.length > 0,
        videoLines: videoLines.length,
        audioLines: audioLines.length,
        sdpLength: answer.sdp.length,
      });

      // Process any buffered ICE candidates
      console.log("Processing buffered ICE candidates after remote description set...");
      
      // Check if ICE connection is stuck
      if (this.peerConnection.iceConnectionState === "new") {
        console.log("ICE connection stuck in 'new' state, forcing restart...");
        
        // Force ICE restart
        try {
          await this.peerConnection.restartIce();
          console.log("ICE restart initiated to resolve stuck connection");
        } catch (error) {
          console.error("ICE restart failed:", error);
        }
      }

      // Force connection establishment
      console.log("Forcing connection establishment after answer...");
      
      // Create a data channel to force ICE connection
      try {
        const dataChannel = this.peerConnection.createDataChannel("force-connection");
        dataChannel.onopen = () => {
          console.log("Data channel opened, ICE connection should be established");
          dataChannel.close();
        };
        console.log("Data channel created to force ICE connection (caller side)");
      } catch (error) {
        console.log("Data channel creation failed (may already exist):", error);
      }

      // Log final state
      console.log("After setting remote description:");
      console.log("Local tracks:", this.peerConnection.getSenders().length);
      console.log("Remote tracks:", this.peerConnection.getReceivers().length);
      console.log("Peer connection state:", this.peerConnection.connectionState);
      console.log("ICE connection state:", this.peerConnection.iceConnectionState);

      // Log peer connection state after answer
      console.log("Peer connection state after answer:", {
        connectionState: this.peerConnection.connectionState,
        iceConnectionState: this.peerConnection.iceConnectionState,
        iceGatheringState: this.peerConnection.iceGatheringState,
        signalingState: this.peerConnection.signalingState,
      });

      console.log("WebRTC connection established! Audio should now work.");

    } catch (error) {
      console.error("Failed to handle answer:", error);
    }
  }

  private handleIceCandidate(data: any) {
    try {
      const { candidate, receiverId, senderId } = data;
      
      if (!this.peerConnection) {
        console.error("No peer connection to handle ICE candidate");
        return;
      }

      // Check if remote description is set
      if (this.peerConnection.remoteDescription) {
        this.peerConnection.addIceCandidate(candidate);
        console.log("ICE candidate added to peer connection");
      } else {
        // Buffer the candidate until remote description is set
        this.pendingOffers.push(candidate);
        console.log("ICE candidate buffered (remote description not set yet)");
      }

    } catch (error) {
      console.error("Failed to handle ICE candidate:", error);
    }
  }

  private handleCallEnded() {
    console.log("Call ended event received");
    this.cleanupCall();
    
    if (this.onCallEnded) {
      this.onCallEnded();
    }
  }

  private handleCallFailed(error: any) {
    console.error("Call failed event received:", error);
    this.cleanupCall();
    
    if (this.onCallFailed) {
      this.onCallFailed(error);
    }
  }

  private cleanupCall() {
    console.log("Cleaning up call resources...");
    
    // Clear pending offers
    this.pendingOffers = [];
    console.log("Pending offers cleared");
    
    // Reset event counters
    Object.keys(this.eventCounters).forEach(key => {
      this.eventCounters[key as keyof typeof this.eventCounters] = 0;
    });
    console.log("Event counters reset");
    
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    // Stop local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Clear remote stream
    this.remoteStream = null;
    
    // Clear active call
    this.activeCall = null;
    
    // Clear pending audio element
    this.pendingAudioElement = null;
    
    console.log("Call resources cleaned up");
  }

  // Public methods
  getCurrentCall(): ActiveCall | null {
    return this.activeCall;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  endCall() {
    if (this.socket && this.activeCall) {
      this.socket.emit("endCall", {
        callerId: this.activeCall.callData.callerId,
        receiverId: this.activeCall.callData.receiverId,
        callType: this.activeCall.callData.callType,
      });
    }
    this.cleanupCall();
  }

  // Audio methods
  forceAudioPlayback() {
    if (this.remoteStream) {
      console.log("Force audio playback called");
      
      // Check if we already have a pending audio element
      if (this.pendingAudioElement) {
        console.log("Audio element already exists, skipping creation");
        return;
      }
      
      // Create a new audio element to avoid conflicts
      const audioElement = new Audio();
      audioElement.srcObject = this.remoteStream;
      audioElement.autoplay = true;
      audioElement.volume = 1.0;
      
      // Handle autoplay restrictions
      audioElement.play().catch((error) => {
        console.log("Audio play failed, will retry on user interaction");
        this.pendingAudioElement = audioElement;
      });
      
      console.log("Audio element created and configured for force playback");
    }
  }

  startPendingAudio() {
    if (this.pendingAudioElement) {
      this.pendingAudioElement.play().catch((error) => {
        console.error("Failed to start pending audio:", error);
      });
      this.pendingAudioElement = null;
    }
  }

  getAudioDebugInfo() {
    return {
      hasRemoteStream: !!this.remoteStream,
      remoteStreamTracks: this.remoteStream?.getTracks().length || 0,
      remoteAudioTracks: this.remoteStream?.getAudioTracks().length || 0,
      remoteVideoTracks: this.remoteStream?.getVideoTracks().length || 0,
      peerConnectionState: this.peerConnection?.connectionState || "null",
      iceConnectionState: this.peerConnection?.iceConnectionState || "null",
      hasPendingAudioElement: !!this.pendingAudioElement,
    };
  }

  notifyAudioSetupComplete() {
    console.log("UI has successfully set up audio, clearing pending audio...");
    this.pendingAudioElement = null;
  }

  testAudioPlayback() {
    if (this.remoteStream) {
      console.log("Testing audio playback...");
      
      // Create a test audio element
      const testAudio = new Audio();
      testAudio.srcObject = this.remoteStream;
      testAudio.volume = 0.5; // Lower volume for testing
      
      // Try to play
      testAudio.play()
        .then(() => {
          console.log("Test audio playback successful");
          
          // Stop after 2 seconds
          setTimeout(() => {
            testAudio.pause();
            testAudio.currentTime = 0;
            console.log("Test audio stopped");
          }, 2000);
        })
        .catch((error) => {
          console.error("Test audio playback failed:", error);
        });
    }
  }

  isCallInProgress(): boolean {
    return this.activeCall?.callData.status === "ringing" || 
           this.activeCall?.callData.status === "active";
  }

  handleUserInteraction() {
    console.log("User interaction detected, attempting to start audio...");
    
    // Start any pending audio
    this.startPendingAudio();
    
    // Only force audio playback if UI hasn't already set it up
    if (this.remoteStream && !this.pendingAudioElement) {
      console.log("UI hasn't set up audio, forcing playback...");
      this.forceAudioPlayback();
    } else {
      console.log("Audio already set up by UI, skipping force playback");
    }
    
    // Log current audio status
    console.log("Audio debug info:", this.getAudioDebugInfo());
  }

  // Sound methods
  startRingtone() {
    if (this.ringingSound) {
      this.ringingSound.play().catch(console.error);
    }
  }

  stopRingtone() {
    if (this.ringingSound) {
      this.ringingSound.pause();
      this.ringingSound.currentTime = 0;
    }
  }

  startCallRingtone() {
    if (this.callingSound) {
      this.callingSound.play().catch(console.error);
    }
  }

  stopCallRingtone() {
    if (this.callingSound) {
      this.callingSound.pause();
      this.callingSound.currentTime = 0;
    }
  }

  // Screen sharing methods
  startScreenShare(stream: MediaStream) {
    if (this.peerConnection) {
      const sender = this.peerConnection.getSenders().find(s => s.track?.kind === "video");
      if (sender) {
        sender.replaceTrack(stream.getVideoTracks()[0]);
      }
    }
  }

  stopScreenShare() {
    if (this.peerConnection && this.localStream) {
      const sender = this.peerConnection.getSenders().find(s => s.track?.kind === "video");
      const localVideoTrack = this.localStream.getVideoTracks()[0];
      if (sender && localVideoTrack) {
        sender.replaceTrack(localVideoTrack);
      }
    }
  }

  getRemoteScreenShareStream(): MediaStream | null {
    return null; // Implement if needed
  }

  // Debug method
  debugSocketServer() {
    if (this.socket) {
      console.log("Requesting socket server state...");
      this.socket.emit("debug", { timestamp: Date.now() });
    }
  }
}

export default new CallingService();


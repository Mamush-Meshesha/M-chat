import { io, Socket } from "socket.io-client";
import { config } from "../config/config";

class SocketManager {
  private static instance: SocketManager;
  public socket: Socket | null = null;

  private constructor() {
    // If user is already logged in, connect immediately.
    if (this.isUserAuthenticated()) {
      this.connect();
    }
    // If not, the app should call connect() after login.
  }

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  private getAuthToken(): string | null {
    try {
      const storedUser = localStorage.getItem("authUser");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        return user?.token || null;
      }
      return null;
    } catch (error) {
      console.error("Error getting auth token:", error);
      return null;
    }
  }

  private isUserAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  /**
   * Connects or reconnects the socket.
   * This is the primary method to call after login or to force a connection.
   */
  public connect() {
    // Disconnect any existing socket before creating a new one
    if (this.socket) {
      console.log(
        "🔄 Disconnecting existing socket before creating a new one..."
      );
      this.socket.disconnect();
    }

    const authToken = this.getAuthToken();
    if (!authToken) {
      console.error(
        "❌ SocketManager: User not authenticated. Cannot connect."
      );
      return;
    }

    console.log("🚀 SocketManager: Attempting to connect...");

    this.socket = io(config.SOCKET_URL, {
      // ✅ --- KEY CHANGES FOR SPEED AND RELIABILITY --- ✅
      reconnection: true, // Enable built-in reconnection
      reconnectionAttempts: 5, // Attempt to reconnect 5 times
      reconnectionDelay: 1000, // Start with a 1s delay
      reconnectionDelayMax: 5000, // Max delay is 5s
      timeout: 5000, // Connection timeout after 5s (down from 20s!)
      transports: ["websocket"], // Use websockets only
      // Auth token is sent on connection and during every reconnection attempt
      auth: {
        token: authToken,
      },
    });

    this.setupEventListeners();
  }

  /**
   * Sets up all the necessary event listeners for the socket instance.
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Clean up previous listeners to prevent duplicates
    this.socket.off();

    this.socket.on("connect", () => {
      console.log(
        `✅ Socket connected successfully with ID: ${this.socket?.id}`
      );
    });

    this.socket.on("disconnect", (reason) => {
      console.log(`❌ Socket disconnected. Reason: ${reason}`);
      // Socket.IO will automatically try to reconnect unless we call socket.disconnect()
      if (reason === "io server disconnect") {
        // The server disconnected us, maybe auth failed.
        // The client will automatically try to reconnect.
        console.log(
          "Server disconnected the socket. Attempting to reconnect..."
        );
      }
    });

    this.socket.on("connect_error", (error) => {
      console.error(`❌ Socket connection error: ${error.message}`);
      // This event is fired on failed connection attempts.
      // Socket.IO's backoff strategy will handle subsequent retries.
    });
  }

  public disconnect() {
    if (this.socket) {
      console.log("🔌 Manually disconnecting socket.");
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Legacy methods for compatibility
  public getSocketId(): string | null {
    return this.socket?.id || null;
  }

  public hasSocket(): boolean {
    return this.socket !== null;
  }

  public getSocketStatus(): {
    hasSocket: boolean;
    isConnected: boolean;
    socketId: string | null;
  } {
    return {
      hasSocket: this.hasSocket(),
      isConnected: this.isConnected(),
      socketId: this.getSocketId(),
    };
  }

  // For compatibility with existing code
  public async createSocket(): Promise<Socket> {
    if (!this.socket || !this.socket.connected) {
      this.connect();
    }
    return this.socket!;
  }
}

export default SocketManager.getInstance();

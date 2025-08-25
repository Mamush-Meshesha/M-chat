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
    // Only disconnect if we have a connected socket
    if (this.socket && this.socket.connected) {
      console.log(
        "🔄 Disconnecting existing connected socket before creating a new one..."
      );
      this.socket.disconnect();
      // Wait a bit for the disconnect to complete
      setTimeout(() => {
        this.createNewConnection();
      }, 100);
    } else {
      // No existing socket or socket not connected, create new one directly
      this.createNewConnection();
    }
  }

  private createNewConnection() {
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
      reconnectionAttempts: 10, // Increase reconnection attempts
      reconnectionDelay: 2000, // Start with a 2s delay
      reconnectionDelayMax: 10000, // Max delay is 10s
      timeout: 20000, // Increase connection timeout for Render
      transports: ["polling", "websocket"], // Prioritize polling for Render compatibility
      forceNew: false, // Don't force new connections
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
      console.log("🔌 Socket connection details:", {
        socketId: this.socket?.id,
        connected: this.socket?.connected,
        transport: this.socket?.io?.engine?.transport?.name,
        url: config.SOCKET_URL,
        timestamp: new Date().toISOString(),
      });
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
      console.error("🔌 Connection error details:", {
        error: error.message,
        url: config.SOCKET_URL,
        timestamp: new Date().toISOString(),
      });
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

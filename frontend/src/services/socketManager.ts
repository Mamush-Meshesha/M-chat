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
    // CRITICAL FIX: Prevent multiple socket connections
    if (this.socket && this.socket.connected) {
      console.log(
        "🔄 Socket already connected, skipping duplicate connection..."
      );
      return; // Don't create another connection if one already exists
    }

    // Only disconnect if we have a socket that's in a bad state
    if (this.socket && !this.socket.connected) {
      console.log(
        "🔄 Disconnecting existing disconnected socket before creating a new one..."
      );
      this.socket.disconnect();
      this.socket = null;
      // Wait a bit for the disconnect to complete, then create new connection
      setTimeout(() => {
        this.createNewConnection();
      }, 200); // Increased timeout for better cleanup
    } else {
      // No existing socket, create new one directly
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

    try {
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

      // Only setup event listeners if socket was created successfully
      if (this.socket) {
        this.setupEventListeners();
      } else {
        console.error("❌ Failed to create socket connection");
      }
    } catch (error) {
      console.error("❌ Error creating socket connection:", error);
      this.socket = null;
    }
  }

  /**
   * Sets up all the necessary event listeners for the socket instance.
   */
  private setupEventListeners(): void {
    if (!this.socket) {
      console.error("❌ Cannot setup event listeners: socket is null");
      return;
    }

    try {
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

      console.log("✅ Event listeners setup completed successfully");
    } catch (error) {
      console.error("❌ Error setting up event listeners:", error);
    }
  }

  /**
   * Safely gets the socket instance.
   * Returns null if socket is not available or not connected.
   */
  public getSocket(): Socket | null {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }
    return null;
  }

  /**
   * Checks if the socket is connected and ready.
   */
  public isConnected(): boolean {
    return !!(this.socket && this.socket.connected);
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

  /**
   * Safely disconnects the socket if it exists.
   */
  public disconnect() {
    if (this.socket) {
      console.log("🔌 Manually disconnecting socket.");
      try {
        this.socket.disconnect();
        this.socket = null;
        console.log("✅ Socket disconnected successfully.");
      } catch (error) {
        console.error("❌ Error disconnecting socket:", error);
        this.socket = null;
      }
    } else {
      console.log("🔌 No socket to disconnect.");
    }
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

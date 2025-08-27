import { io, Socket } from "socket.io-client";
import { getApiUrl } from "../config/config";

class SocketManager {
  private socket: Socket | null = null;
  private isConnecting: boolean = false;
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 5;
  private socketUrl: string = "";

  async connect(): Promise<Socket> {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.isConnecting) {
      // Wait for connection to complete
      return new Promise<Socket>((resolve) => {
        const checkConnection = () => {
          if (this.socket?.connected) {
            resolve(this.socket);
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    }

    this.socket = this.createNewConnection();
    return this.socket;
  }

  createNewConnection(): Socket {
    if (this.isConnecting) {
      throw new Error("Connection already in progress");
    }

    this.isConnecting = true;
    this.connectionAttempts++;

    try {
      this.socketUrl = getApiUrl("");
      console.log(
        `🔌 Attempting socket connection to: ${this.socketUrl} (Attempt ${this.connectionAttempts}/${this.maxConnectionAttempts})`
      );

      // Prioritize polling for Render compatibility, fallback to WebSocket
      const socket = io(this.socketUrl, {
        transports: ["polling", "websocket"], // Polling first for Render compatibility
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 30000,
        forceNew: true,
        upgrade: true,
        rememberUpgrade: false,
      });

      this.setupEventListeners(socket);
      this.socket = socket;
      this.isConnecting = false;

      return socket;
    } catch (error) {
      this.isConnecting = false;
      console.error("❌ Socket connection creation failed:", error);
      throw error;
    }
  }

  private setupEventListeners(socket: Socket) {
    socket.on("connect", () => {
      console.log("✅ Socket connected successfully!");
      console.log("🆔 Socket ID:", socket.id);
      console.log("🚀 Transport:", socket.io.engine.transport.name);
      console.log("🔗 Connected to:", this.socketUrl);
      this.connectionAttempts = 0; // Reset attempts on successful connection
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
      if (reason === "io server disconnect") {
        console.log(
          "🔄 Server initiated disconnect, attempting to reconnect..."
        );
        socket.connect();
      }
    });

    socket.on("connect_error", (error) => {
      console.error("💥 Socket connection error:", error);
      console.error("🔍 Error details:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });

      // Force fallback to polling if WebSocket fails
      if (socket.io.engine.transport.name === "websocket") {
        console.log("🌐 WebSocket failed, forcing polling transport...");
        // Note: We can't directly change transport name, but the client will fallback automatically
      }

      // If we've exceeded max attempts, try a different approach
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        console.log(
          "🔄 Max connection attempts reached, trying alternative approach..."
        );
        this.tryAlternativeConnection(socket);
      }
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log("🔄 Socket reconnected after", attemptNumber, "attempts");
      this.connectionAttempts = 0; // Reset attempts on successful reconnection
    });

    socket.on("reconnect_error", (error) => {
      console.error("💥 Socket reconnection error:", error);
    });

    socket.on("reconnect_failed", () => {
      console.error("💀 Socket reconnection failed after all attempts");
      console.log("🔄 Trying alternative connection method...");
      this.tryAlternativeConnection(socket);
    });

    // Add transport upgrade event listener
    socket.io.engine.on("upgrade", () => {
      console.log("🚀 Transport upgraded to:", socket.io.engine.transport.name);
    });

    socket.io.engine.on("upgradeError", (error) => {
      console.error("💥 Transport upgrade failed:", error);
    });
  }

  private tryAlternativeConnection(socket: Socket) {
    console.log("🔄 Attempting alternative connection method...");

    // Try forcing polling transport
    if (socket.io.engine.transport.name !== "polling") {
      console.log("🔄 Forcing polling transport...");
      // Note: We can't directly change transport name, but the client will fallback automatically
    }

    // Try reconnecting with different options
    setTimeout(() => {
      if (!socket.connected) {
        console.log("🔄 Attempting reconnection with alternative options...");
        socket.connect();
      }
    }, 2000);
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      console.log("🔌 Manually disconnecting socket...");
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Health check method
  isHealthy(): boolean {
    return this.socket?.connected || false;
  }

  // Get connection status
  getConnectionStatus(): string {
    if (!this.socket) return "disconnected";
    if (this.socket.connected) return "connected";
    if (this.isConnecting) return "connecting";
    return "disconnected";
  }
}

export default new SocketManager();

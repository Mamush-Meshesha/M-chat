import { io, Socket } from "socket.io-client";

class SocketManager {
  private static instance: SocketManager;
  private socket: Socket | null = null;
  private isConnecting: boolean = false;
  private connectionPromise: Promise<Socket> | null = null;

  private constructor() {}

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  // Get socket instance
  getSocket(): Socket | null {
    return this.socket;
  }

  // Check if socket is connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Get connection status
  getConnectionStatus(): string {
    if (!this.socket) return "disconnected";
    if (this.socket.connected) return "connected";
    if (this.socket.connecting) return "connecting";
    return "disconnected";
  }

  // Force reconnect
  async forceReconnect(): Promise<void> {
    console.log("🔄 Force reconnecting socket...");
    if (this.socket) {
      this.socket.disconnect();
    }
    this.socket = null;
    await this.createSocket();
  }

  // Check if user is authenticated
  isUserAuthenticated(): boolean {
    try {
      console.log("🔐 SocketManager: Checking authentication...");
      const storedUser = localStorage.getItem("authUser");
      console.log("🔐 SocketManager: Stored user data:", storedUser);

      if (storedUser) {
        const user = JSON.parse(storedUser);
        console.log("🔐 SocketManager: Parsed user:", {
          hasId: !!user?._id,
          hasName: !!user?.name,
          hasEmail: !!user?.email,
          hasToken: !!user?.token,
          tokenPreview: user?.token
            ? user.token.substring(0, 20) + "..."
            : "none",
        });

        const isAuth = !!(user && user.token);
        console.log("🔐 SocketManager: Authentication result:", isAuth);
        return isAuth;
      }

      console.log("🔐 SocketManager: No stored user data found");
      return false;
    } catch (error) {
      console.error("❌ SocketManager: Error checking authentication:", error);
      return false;
    }
  }

  // Get current auth token
  getAuthToken(): string | null {
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

  // Public method to create socket
  async createSocket(): Promise<Socket> {
    console.log("🔐 SocketManager: createSocket called");
    console.log("🔐 SocketManager: Checking authentication...");

    // Check if user is authenticated first
    if (!this.isUserAuthenticated()) {
      console.error(
        "❌ SocketManager: User not authenticated. Cannot create socket connection."
      );
      console.log(
        "🔐 SocketManager: localStorage content:",
        localStorage.getItem("authUser")
      );
      throw new Error(
        "User not authenticated. Cannot create socket connection."
      );
    }

    console.log(
      "✅ SocketManager: User is authenticated, proceeding with socket creation"
    );

    if (this.socket && this.socket.connected) {
      console.log("✅ SocketManager: Reusing existing connected socket");
      return this.socket;
    }

    if (this.isConnecting && this.connectionPromise) {
      console.log(
        "🔄 SocketManager: Socket connection already in progress, waiting..."
      );
      return this.connectionPromise;
    }

    console.log("🔄 SocketManager: Creating new socket connection...");
    this.isConnecting = true;
    this.connectionPromise = this.createSocketInternal();

    try {
      const socket = await this.connectionPromise;
      this.socket = socket;
      this.isConnecting = false;
      this.connectionPromise = null;
      console.log("✅ SocketManager: Socket created successfully");
      return socket;
    } catch (error) {
      console.error("❌ SocketManager: Failed to create socket:", error);
      this.isConnecting = false;
      this.connectionPromise = null;
      throw error;
    }
  }

  private createSocketInternal(): Promise<Socket> {
    return new Promise((resolve, reject) => {
      console.log("🔐 SocketManager: createSocketInternal called");

      // Get auth token using the helper method
      const authToken = this.getAuthToken();
      console.log(
        "🔐 SocketManager: Auth token status:",
        authToken ? "exists" : "missing"
      );

      if (authToken) {
        console.log(
          "🔐 SocketManager: Token preview:",
          authToken.substring(0, 20) + "..."
        );
      }

      console.log(
        "🔐 SocketManager: Creating socket connection to http://localhost:8000"
      );
      const socket = io("http://localhost:8000", {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: false,
        autoConnect: true,
        // Add auth token to query parameters for authentication
        query: authToken ? { token: authToken } : {},
        // Add auth headers if needed
        extraHeaders: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });

      console.log(
        "🔐 SocketManager: Socket created, setting up event listeners..."
      );

      const connectionTimeout = setTimeout(() => {
        console.error("SocketManager: Connection timeout after 20 seconds");
        reject(new Error("Socket connection timeout"));
      }, 20000);

      socket.on("connect", () => {
        console.log("✅ SocketManager: Socket connected with ID:", socket.id);
        if (authToken) {
          console.log("✅ SocketManager: Authenticated connection established");
        } else {
          console.log(
            "⚠️ SocketManager: Connection established without authentication"
          );
        }
        clearTimeout(connectionTimeout);
        resolve(socket);
      });

      socket.on("connect_error", (error) => {
        console.error("❌ SocketManager: Socket connection error:", error);
        console.error("❌ SocketManager: Error details:", {
          message: error.message,
          description: error.description,
          context: error.context,
        });
        clearTimeout(connectionTimeout);
        reject(error);
      });

      socket.on("disconnect", (reason) => {
        console.log("❌ SocketManager: Socket disconnected, reason:", reason);

        // Always try to reconnect unless it's a manual disconnect
        if (reason !== "io client disconnect") {
          console.log("SocketManager: Attempting to reconnect...");
          setTimeout(() => {
            if (!socket.connected) {
              console.log("SocketManager: Reconnecting socket...");
              socket.connect();
            }
          }, 1000);
        }

        // If it's a server disconnect, try to reconnect immediately
        if (reason === "io server disconnect") {
          console.log(
            "SocketManager: Server disconnected, attempting to reconnect..."
          );
          socket.connect();
        }
      });

      socket.on("reconnect", (attemptNumber) => {
        console.log(
          "✅ SocketManager: Socket reconnected after",
          attemptNumber,
          "attempts"
        );
        // Emit a reconnection event that components can listen to
        socket.emit("socketReconnected", {
          socketId: socket.id,
          attemptNumber,
        });
      });

      socket.on("reconnect_error", (error) => {
        console.error("❌ SocketManager: Socket reconnection error:", error);
      });

      socket.on("reconnect_failed", () => {
        console.error(
          "❌ SocketManager: Socket reconnection failed after all attempts"
        );
        // Reset socket to allow new connection attempts
        this.socket = null;
      });
    });
  }

  getSocketId(): string | null {
    return this.socket?.id || null;
  }

  hasSocket(): boolean {
    return this.socket !== null;
  }

  getSocketStatus(): {
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

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default SocketManager.getInstance();

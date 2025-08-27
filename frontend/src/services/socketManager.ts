import { io, Socket } from "socket.io-client";
import { getApiUrl } from "../config/config";

class SocketManager {
  private socket: Socket | null = null;
  private isConnecting: boolean = false;

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.isConnecting) {
      // Wait for connection to complete
      return new Promise((resolve) => {
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

    try {
      const socket = io(getApiUrl(), {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
      });

      this.setupEventListeners(socket);
      this.socket = socket;
      this.isConnecting = false;

      return socket;
    } catch (error) {
      this.isConnecting = false;
      throw error;
    }
  }

  private setupEventListeners(socket: Socket) {
    socket.on("connect", () => {
      console.log("Socket connected with ID:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default new SocketManager();

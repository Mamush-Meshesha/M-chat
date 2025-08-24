import { environment } from "./environment";

// Configuration file for environment-specific settings
export const config = {
  // Socket server URL
  SOCKET_URL: environment.getSocketUrl(),

  // Backend API URL
  API_BASE_URL: environment.getApiBaseUrl(),

  // API endpoints
  API_ENDPOINTS: {
    AUTH: "/api/users/auth",
    LOGOUT: "/api/users/logout",
    GET_FRIENDS: "/api/users/get-friends",
    SEND_MESSAGE: "/api/users/send-message",
    GET_MESSAGE: "/api/users/message",
    CALLS: "/api/calls",
  },

  // Socket configuration
  SOCKET_CONFIG: {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 5000,
    transports: ["websocket"],
  },
};

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  return `${config.API_BASE_URL}${endpoint}`;
};

// Helper function to get socket URL
export const getSocketUrl = (): string => {
  return config.SOCKET_URL;
};

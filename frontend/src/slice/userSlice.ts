import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface User {
  [x: string]: any;
  length: number;
  name: string;
  email: string;
  createdAt: string;
}

interface Send {
  message: string;
  reciverId: string;
  senderName: string;
}

interface Message {
  _id: string;
  senderId: string;
  senderName: string;
  resiverId: string;
  message: {
    text: string;
  };
  createdAt: string;
}

interface UnreadCount {
  [userId: string]: number;
}

export interface userState {
  user: User | null;
  currentUser: null;
  newMessage: string;
  conversation: Send[];
  recConversation: Message[];
  activeUser: Send[];
  error: string;
  loading: boolean;
  typingUsers: string[];
  unreadCounts: UnreadCount;
  notifications: Message[];
}

const initialState: userState = {
  user: null,
  currentUser: null,
  newMessage: "",
  conversation: [],
  recConversation: [],
  activeUser: [],
  error: "",
  loading: false,
  typingUsers: [],
  unreadCounts: {},
  notifications: [],
};

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    fetchUserRequest: (state) => {
      state.loading = true;
    },
    fetchUserSuccess: (state, action) => {
      state.loading = false;
      state.user = action.payload;
    },
    fetchUserFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    sendMessageRequest: (state) => {
      state.loading = true;
    },
    sendMessageSuccess: (state, action: PayloadAction<Send[]>) => {
      state.loading = false;
      state.conversation = action.payload;
      state.newMessage = "";
    },
    sendMessageFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    fetchMessageRequest: (state) => {
      state.loading = true;
    },
    fetchMessageSuccess: (state, action: PayloadAction<Message[]>) => {
      state.recConversation = action.payload;
      state.loading = false;
    },
    fetchMessageFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Real-time message handling
    addMessage: (state, action: PayloadAction<Message>) => {
      state.recConversation.push(action.payload);
    },

    // Unread message handling
    addUnreadMessage: (
      state,
      action: PayloadAction<{ senderId: string; message: Message }>
    ) => {
      const { senderId, message } = action.payload;

      // Only add unread count if not from current user and not in current chat
      if (senderId !== state.currentUser?._id) {
        if (state.unreadCounts[senderId]) {
          state.unreadCounts[senderId] += 1;
        } else {
          state.unreadCounts[senderId] = 1;
        }

        // Add to notifications
        state.notifications.unshift(message);

        // Keep only last 10 notifications
        if (state.notifications.length > 10) {
          state.notifications = state.notifications.slice(0, 10);
        }
      }
    },

    // Mark messages as read
    markMessagesAsRead: (state, action: PayloadAction<string>) => {
      const userId = action.payload;
      if (state.unreadCounts[userId]) {
        state.unreadCounts[userId] = 0;
      }

      // Remove notifications from this user
      state.notifications = state.notifications.filter(
        (notification) => notification.senderId !== userId
      );
    },

    // Clear all notifications
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCounts = {};
    },

    // Typing indicators
    setTypingUser: (state, action: PayloadAction<string>) => {
      if (!state.typingUsers.includes(action.payload)) {
        state.typingUsers.push(action.payload);
      }
    },

    removeTypingUser: (state, action: PayloadAction<string>) => {
      state.typingUsers = state.typingUsers.filter(
        (id) => id !== action.payload
      );
    },

    // local state
    setCurrentUser: (state, action: PayloadAction<null>) => {
      state.currentUser = action.payload;
    },
    setNewMessage: (state, action: PayloadAction<string>) => {
      state.newMessage = action.payload;
    },
    setActiveUser: (state, action) => {
      state.activeUser = action.payload;
    },
  },
});

export const {
  fetchUserFailure,
  fetchUserRequest,
  fetchUserSuccess,
  setCurrentUser,
  setNewMessage,
  sendMessageFailure,
  sendMessageRequest,
  sendMessageSuccess,
  fetchMessageFailure,
  fetchMessageRequest,
  fetchMessageSuccess,
  setActiveUser,
  addMessage,
  addUnreadMessage,
  markMessagesAsRead,
  clearNotifications,
  setTypingUser,
  removeTypingUser,
} = userSlice.actions;

export default userSlice.reducer;

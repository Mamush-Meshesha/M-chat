import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface User {
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
export interface userState {
  user: User | null;
  currentUser: null;
  newMessage: string;
  conversation: Send[]
  recConversation: Send[]
  activeUser: Send[]
  error: string;
  loading: boolean;
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
      state.newMessage =""
    },
    sendMessageFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    fetchMessageRequest: (state) => {
      state.loading = true;
    },
    fetchMessageSuccess: (state, action: PayloadAction<Send[]>) => {
      state.recConversation = action.payload;
      state.loading = false;
    },
    fetchMessageFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    // local state
    setCurrentUser: (state, action: PayloadAction<null>) => {
      state.currentUser = action.payload;
    },
    setNewMessage: (state, action: PayloadAction<string>) => {
      state.newMessage = action.payload;
    },
    setActiveUser: (state,action) =>{
      state.activeUser = action.payload
    }
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
  setActiveUser
} = userSlice.actions;

export default userSlice.reducer;

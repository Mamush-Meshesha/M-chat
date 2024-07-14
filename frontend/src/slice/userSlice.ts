import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface User {
  length: number;
  name: string;
  email: string;
  createdAt: string;
}
export interface userState {
  user: User | null;
  currentUser: null;
  newMessage: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conversation: any;
  error: string;
  loading: boolean;
}

const initialState: userState = {
  user: null,
  currentUser: null,
  newMessage: "",
  conversation: [],
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
    sendMessageSuccess: (state, action: PayloadAction<string[]>) => {
      state.loading = false;
      state.conversation = action.payload;
    },
    sendMessageFailure: (state, action: PayloadAction<string>) => {
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
  sendMessageSuccess
} = userSlice.actions;

export default userSlice.reducer;

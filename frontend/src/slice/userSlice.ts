import { createSlice } from "@reduxjs/toolkit";

interface User {
  length: number;
  map(arg0: (user: any, index: any) => import("react/jsx-runtime").JSX.Element): import("react").ReactNode;
  name: string;
  email: string;
  createdAt: string;
}
export interface userState {
  user: User | null;
  error: string;
  loading: boolean;
}

const initialState: userState = {
  user: null,
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
  },
});

export const { fetchUserFailure, fetchUserRequest, fetchUserSuccess } =
  userSlice.actions;

export default userSlice.reducer;

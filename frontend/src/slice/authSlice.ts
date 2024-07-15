import { createSlice } from "@reduxjs/toolkit";

interface User {
  name: string;
  email: string;
  password: string;
}

interface auUser {
  email: string;
  password: string;
  name: string
}
export interface AuthStateProps {
  user: User[];
  auUser: auUser[];
  authenticated: boolean;
  error: string;
  isLoading: boolean;
}

const initialState: AuthStateProps = {
  user: [],
  auUser: [],
  authenticated: false,
  error: "",
  isLoading: false,
};

export const AuthSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    registerUserRequest: (state) => {
      state.isLoading = true;
    },
    registerUserSuccesss: (state, action) => {
      state.isLoading = false;
      state.user = action.payload;
      localStorage.setItem("authenticate", JSON.stringify(true));
      localStorage.setItem("userInfo", JSON.stringify(action.payload));
    },
    registerUserFailure: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
      state.authenticated = false;
    },

    loginUserRequest: (state) => {
      state.isLoading = true;
    },
    loginUserSuccess: (state, action) => {
      state.isLoading = false;
      state.auUser = action.payload;
      state.authenticated = true;
    },
    loginUserFailure: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
      state.authenticated = false;
    },
    logoutUserRequest: (state) => {
      state.isLoading = true;
    },
    logoutUseSuccess: (state) => {
      state.auUser = [];
      state.isLoading = false;
      state.authenticated = false;
    },
    logoutUserFailure: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    },
  },
});

export const {
  registerUserFailure,
  registerUserRequest,
  registerUserSuccesss,
  loginUserFailure,
  loginUserRequest,
  loginUserSuccess,
  logoutUseSuccess,
  logoutUserRequest,
  logoutUserFailure,
} = AuthSlice.actions;
export default AuthSlice.reducer;

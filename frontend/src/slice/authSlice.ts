import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface User {
  _id: string;
  name: string;
  email: string;
  token?: string; // Add token back since backend doesn't use HTTP-only
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Login actions
    loginStart: (
      state,
      action: PayloadAction<{ email: string; password: string }>
    ) => {
      state.isLoading = true;
      state.error = null;
      // Don't set user or isAuthenticated here - wait for success
    },
    loginSuccess: (state, action: PayloadAction<User>) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload;
      state.error = null;
      localStorage.setItem("authUser", JSON.stringify(action.payload));
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.error = action.payload;
      localStorage.removeItem("authUser");
    },

    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;

      localStorage.removeItem("authUser");
    },

    restoreAuth: (state) => {
      try {
        const storedUser = localStorage.getItem("authUser");
        if (storedUser) {
          const user = JSON.parse(storedUser);
          // Validate user data including token
          if (user && user._id && user.name && user.email && user.token) {
            state.user = user;
            state.isAuthenticated = true;
            console.log("✅ Auth restored from localStorage:", user.name);
            console.log("✅ Token exists:", user.token ? "yes" : "no");
          } else {
            console.log(
              "❌ Invalid user data or missing token in localStorage, clearing..."
            );
            console.log("❌ User data:", {
              hasId: !!user?._id,
              hasName: !!user?.name,
              hasEmail: !!user?.email,
              hasToken: !!user?.token,
            });
            localStorage.removeItem("authUser");
            state.user = null;
            state.isAuthenticated = false;
          }
        } else {
          console.log("ℹ️ No stored auth data found");
          state.user = null;
          state.isAuthenticated = false;
        }
      } catch (error) {
        console.error("❌ Error restoring auth:", error);
        localStorage.removeItem("authUser");
        state.user = null;
        state.isAuthenticated = false;
      }
    },

    // Clear all auth data (for debugging)
    clearAuth: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
      localStorage.removeItem("authUser");
      console.log("🧹 All auth data cleared");
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  restoreAuth,
  clearAuth,
} = authSlice.actions;

export default authSlice.reducer;

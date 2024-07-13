import { combineReducers } from "@reduxjs/toolkit";
import authSlice from "../slice/authSlice";
import userSlice from "../slice/userSlice";

const rootReducer = combineReducers({
  auth: authSlice,
  user: userSlice,
});

export default rootReducer;

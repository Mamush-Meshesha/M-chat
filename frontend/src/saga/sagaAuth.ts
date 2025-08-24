/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, all, takeLatest, put, takeEvery } from "redux-saga/effects";
import {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
} from "../slice/authSlice";
import axios, { AxiosResponse } from "axios";
import { PayloadAction } from "@reduxjs/toolkit";
import {
  fetchMessageRequest,
  fetchMessageSuccess,
  fetchUserFailure,
  fetchUserRequest,
  fetchUserSuccess,
  sendMessageFailure,
  sendMessageRequest,
  sendMessageSuccess,
} from "../slice/userSlice";
import { getApiUrl } from "../config/config";

function* loginUser(
  action: PayloadAction<{ email: string; password: string }>
) {
  try {
    const { email, password } = action.payload;

    if (!email || !password) {
      yield put(loginFailure("Email and password are required"));
      return;
    }

    // Make real API call to your backend using Redux Saga pattern
    const response: AxiosResponse = yield call(
      axios.post,
      getApiUrl("/api/users/auth"),
      {
        email,
        password,
      }
    );

    console.log("Login API response:", response.data);

    // Backend should return user data (token might be in response or cookie)
    if (response.data && response.data._id) {
      // If token is in response, include it; if not, it's in cookie
      const userData = {
        _id: response.data._id,
        name: response.data.name,
        email: response.data.email,
        token: response.data.token, // Include token if backend sends it
      };

      yield put(loginSuccess(userData));
    } else {
      yield put(loginFailure("Invalid response from server"));
    }
  } catch (error: any) {
    console.error("Login error:", error);
    yield put(loginFailure(error.response?.data?.message || error.message));
  }
}

function* logoutUser() {
  try {
    // Make real API call to logout endpoint
    yield call(
      axios.post,
      getApiUrl("/api/users/logout"),
      {},
      {
        withCredentials: true, // Important for HTTP-only cookies
      }
    );

    // Always logout locally regardless of API response
    yield put(logout());
  } catch (error: any) {
    console.error("Logout error:", error);
    // Still logout even if API call fails
    yield put(logout());
  }
}

function* fetchFriends() {
  try {
    const res: AxiosResponse = yield call(
      axios.get,
      getApiUrl("/api/users/get-friends"),
      {
        withCredentials: true,
      }
    );
    yield put(fetchUserSuccess(res.data));
  } catch (error: any) {
    yield put(fetchUserFailure(error.message));
  }
}

function* sendMessageSaga(action: PayloadAction<any>) {
  try {
    const res: AxiosResponse = yield call(
      axios.post,
      getApiUrl("/api/users/send-message"),
      action.payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      }
    );
    yield put(sendMessageSuccess(res.data));
    console.log(res.data);
  } catch (error: any) {
    yield put(sendMessageFailure(error.message));
  }
}

function* fetchMessageSaga(action: PayloadAction<string>) {
  try {
    const res: AxiosResponse = yield call(
      axios.get,
      getApiUrl(`/api/users/message/${action.payload}`),
      {
        withCredentials: true,
      }
    );
    yield put(fetchMessageSuccess(res.data));
  } catch (error: any) {
    yield put(fetchUserFailure(error.message));
  }
}

function* watchLoginUser() {
  yield takeLatest(loginStart.type, loginUser);
}

function* watchLogoutUser() {
  yield takeLatest(logout.type, logoutUser);
}

function* watchFetchFriends() {
  yield takeLatest(fetchUserRequest.type, fetchFriends);
}

function* watchSendMessage() {
  yield takeLatest(sendMessageRequest.type, sendMessageSaga);
}

function* watchFetchMessageSaga() {
  yield takeEvery(fetchMessageRequest.type, fetchMessageSaga);
}

// root saga
export default function* rootSaga() {
  yield all([
    watchLoginUser(),
    watchLogoutUser(),
    watchFetchFriends(),
    watchSendMessage(),
    watchFetchMessageSaga(),
  ]);
}

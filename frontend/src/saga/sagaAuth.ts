/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, all, takeLatest, put } from "redux-saga/effects";
import {
  loginUserFailure,
  loginUserRequest,
  loginUserSuccess,
  logoutUserFailure,
  logoutUserRequest,
  registerUserFailure,
  registerUserRequest,
  registerUserSuccesss,
} from "../slice/authSlice";
import axios, { AxiosResponse } from "axios";
import { PayloadAction } from "@reduxjs/toolkit";
import {
  fetchUserFailure,
  fetchUserRequest,
  fetchUserSuccess,
} from "../slice/userSlice";
function* registerUser(action: PayloadAction) {
  try {
    const res: AxiosResponse = yield call(
      axios.post,
      "http://localhost:5300/api/users/",
      action.payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    yield put(registerUserSuccesss(res.data));
  } catch (error: any) {
    yield put(registerUserFailure(error.message));
  }
}

function* loginUser(action: PayloadAction) {
  try {
    const res: AxiosResponse = yield call(
      axios.post,
      "http://localhost:5300/api/users/auth",
      action.payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      }
    );
    yield put(loginUserSuccess(res.data));
  } catch (error: any) {
    yield put(loginUserFailure(error.message));
  }
}

function* logoutUser() {
  try {
    const res: AxiosResponse = yield call(
      axios.post,
      "http://localhost:5300/api/users/logout",
      {},
      { withCredentials: true }
    );
    yield put(loginUserSuccess(res.data));
  } catch (error: any) {
    yield put(logoutUserFailure(error.message));
  }
}

function* fetchFriends() {
  try {
    const res: AxiosResponse = yield call(
      axios.get,
      "http://localhost:5300/api/users/get-friends",
      {
        withCredentials: true,
      }
    );
    yield put(fetchUserSuccess(res.data));
  } catch (error: any) {
    yield put(fetchUserFailure(error.message));
  }
}

function* watchRegisterUser() {
  yield takeLatest(registerUserRequest.type, registerUser);
}

function* watchLoginUser() {
  yield takeLatest(loginUserRequest.type, loginUser);
}

function* watchLogoutUser() {
  yield takeLatest(logoutUserRequest.type, logoutUser);
}

function* watchFetchFriends() {
  yield takeLatest(fetchUserRequest.type, fetchFriends);
}

// root saga
export default function* rootSaga() {
  yield all([
    watchRegisterUser(),
    watchLoginUser(),
    watchLogoutUser(),
    watchFetchFriends(),
  ]);
}

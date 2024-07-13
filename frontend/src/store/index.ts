import createSagaMiddleware from "redux-saga";
import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "../reducer/rootReducer";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import rootSaga from "../saga/sagaAuth";

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth"], // Only persist the auth slice
};
const persistedReducer = persistReducer(persistConfig, rootReducer);
const sagaMiddleware = createSagaMiddleware();
const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaulMiddleware) =>
    getDefaulMiddleware({ serializableCheck: false }).concat(sagaMiddleware),
});

export const persistor = persistStore(store);
sagaMiddleware.run(rootSaga);

export default store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

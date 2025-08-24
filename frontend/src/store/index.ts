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
  // Ensure auth state is properly serialized
  serialize: true,
  // Handle any non-serializable values
  transforms: [],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);
const sagaMiddleware = createSagaMiddleware();

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
        ignoredPaths: ["auth.auUser"],
      },
    }).concat(sagaMiddleware),
  devTools: import.meta.env.MODE !== "production",
});

export const persistor = persistStore(store);
sagaMiddleware.run(rootSaga);

export default store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

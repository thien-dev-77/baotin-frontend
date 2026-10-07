import { configureStore } from "@reduxjs/toolkit";
import auth from "./auth-slice";

export const makeStore = () => configureStore({
  reducer: { auth },
  devTools: process.env.NODE_ENV !== "production",
});

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

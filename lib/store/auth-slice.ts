import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { SessionUser } from "@/lib/types";

type AuthState = {
  user: SessionUser | null;
  ready: boolean;
  checking: boolean;
  error: string;
  revision: number;
};

const initialState: AuthState = { user: null, ready: false, checking: false, error: "", revision: 0 };
export const authEventKey = "baotin-auth-event";

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    authCheckStarted(state) {
      state.checking = true;
      state.error = "";
    },
    authReceived(state, action: PayloadAction<SessionUser | null>) {
      state.user = action.payload;
      state.ready = true;
      state.checking = false;
      state.error = "";
      state.revision++;
    },
    authCheckFailed(state, action: PayloadAction<string>) {
      state.ready = true;
      state.checking = false;
      state.error = action.payload;
    },
  },
});

export const { authCheckStarted, authReceived, authCheckFailed } = authSlice.actions;
export default authSlice.reducer;

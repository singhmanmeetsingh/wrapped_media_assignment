import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Platform } from 'react-native';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
}

function loadToken(): string | null {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem('auth_token');
    } catch {
      return null;
    }
  }
  return null;
}

function saveToken(token: string | null) {
  if (Platform.OS === 'web') {
    try {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    } catch {}
  }
}

const persistedToken = loadToken();

const initialState: AuthState = {
  token: persistedToken,
  isAuthenticated: !!persistedToken,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
      state.isAuthenticated = true;
      saveToken(action.payload);
    },
    logout(state) {
      state.token = null;
      state.isAuthenticated = false;
      saveToken(null);
    },
  },
});

export const { setToken, logout } = authSlice.actions;
export default authSlice.reducer;

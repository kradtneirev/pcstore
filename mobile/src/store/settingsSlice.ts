import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import Constants from 'expo-constants';

// Địa chỉ máy chủ mặc định lấy từ app.json (expo.extra.apiUrl)
export const DEFAULT_API_URL: string = (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? 'https://pcstore-api-dbh6.onrender.com';

interface SettingsState {
  apiUrl: string;
}

const initialState: SettingsState = { apiUrl: DEFAULT_API_URL };

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setApiUrl(state, action: PayloadAction<string>) {
      state.apiUrl = action.payload.trim().replace(/\/+$/, '');
    },
    hydrateSettings(state, action: PayloadAction<Partial<SettingsState>>) {
      if (action.payload.apiUrl) state.apiUrl = action.payload.apiUrl;
    },
  },
});

export const { setApiUrl, hydrateSettings } = settingsSlice.actions;
export default settingsSlice.reducer;

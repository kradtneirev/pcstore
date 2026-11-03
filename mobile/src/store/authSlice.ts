import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { api, ApiError, errorMessage } from '../api/client';
import type { User } from '../api/types';

interface AuthState {
  token: string | null;
  user: User | null;
}

const initialState: AuthState = { token: null, user: null };

export const login = createAsyncThunk<{ token: string; user: User }, { identifier: string; password: string }, { rejectValue: string }>(
  'auth/login',
  async ({ identifier, password }, { rejectWithValue }) => {
    try {
      return await api.login(identifier, password);
    } catch (e) {
      return rejectWithValue(errorMessage(e));
    }
  },
);

export const register = createAsyncThunk<
  { token: string; user: User },
  { name: string; email: string; phone: string; password: string },
  { rejectValue: string }
>('auth/register', async (body, { rejectWithValue }) => {
  try {
    return await api.register(body);
  } catch (e) {
    return rejectWithValue(errorMessage(e));
  }
});

// Lấy lại thông tin tài khoản khi mở app; token hết hạn thì tự đăng xuất
export const fetchMe = createAsyncThunk<User, void, { rejectValue: { message: string; status: number } }>(
  'auth/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      return (await api.me()).user;
    } catch (e) {
      return rejectWithValue({ message: errorMessage(e), status: e instanceof ApiError ? e.status : 0 });
    }
  },
);

export const updateProfile = createAsyncThunk<User, Partial<Pick<User, 'name' | 'phone' | 'address'>>, { rejectValue: string }>(
  'auth/updateProfile',
  async (body, { rejectWithValue }) => {
    try {
      return (await api.updateMe(body)).user;
    } catch (e) {
      return rejectWithValue(errorMessage(e));
    }
  },
);

// Đổi mật khẩu: máy chủ trả token mới (các thiết bị khác bị đăng xuất)
export const changePassword = createAsyncThunk<
  { token: string; user: User },
  { currentPassword: string; newPassword: string },
  { rejectValue: string }
>('auth/changePassword', async ({ currentPassword, newPassword }, { rejectWithValue }) => {
  try {
    return await api.changePassword(currentPassword, newPassword);
  } catch (e) {
    return rejectWithValue(errorMessage(e));
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.token = null;
      state.user = null;
    },
    hydrateAuth(state, action: PayloadAction<AuthState>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(changePassword.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
      });
  },
});

export const { logout, hydrateAuth } = authSlice.actions;
export default authSlice.reducer;

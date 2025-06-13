import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { UserProfile, LoginRequest, APIError } from '../../api/types';
import { client } from '../../api/client';
import { 
  setCurrentUserId, 
  setUser, 
  clearCurrentUser,
  clearEntities 
} from './entitiesSlice';
import { 
  setLoggingIn, 
  setLoginError,
  clearViews 
} from './viewsSlice';
import { 
  setAuthError,
  clearAllErrors 
} from './errorsSlice';

// Auth slice state
export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  serverUrl: string | null;
}

const initialState: AuthState = {
  isAuthenticated: !!localStorage.getItem('mattermostToken'),
  token: localStorage.getItem('mattermostToken'),
  serverUrl: localStorage.getItem('mattermostServerUrl'),
};

// Async thunks for auth actions
export const loginUser = createAsyncThunk<
  { user: UserProfile; token: string; serverUrl: string },
  LoginRequest & { serverUrl: string },
  { rejectValue: APIError }
>(
  'auth/login',
  async ({ login_id, password, serverUrl }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoggingIn(true));
      dispatch(setLoginError(null));
      dispatch(setAuthError(null));

      // Configure Client4 with server URL
      client.setUrl(serverUrl);
      
      const user = await client.login(login_id, password);
      const token = client.getToken();
      
      if (!token) {
        throw new Error('No token received from server');
      }

      // Store credentials in localStorage
      localStorage.setItem('mattermostToken', token);
      localStorage.setItem('mattermostServerUrl', serverUrl);
      
      // Store user for easier restore
      localStorage.setItem('mattermostUser', JSON.stringify(user));
      
      // Set auth cookies for direct mode to allow image loading
      // This cookie will be used by the browser to authenticate image requests
      const now = new Date();
      const time = now.getTime();
      const expireTime = time + 1000*3600*24*30; // 30 days
      now.setTime(expireTime);
      document.cookie = `MMAUTHTOKEN=${token}; path=/; expires=${now.toUTCString()}; SameSite=Lax`;
      
      // Set user ID cookie for auth
      document.cookie = `MMUSERID=${user.id}; path=/; SameSite=Lax`;

      // Update entities
      dispatch(setCurrentUserId(user.id));
      dispatch(setUser(user));

      return { user, token, serverUrl };
    } catch (error) {
      // Serialize error for Redux (avoid non-serializable values)
      const serializedError = {
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'Error',
        status_code: (error as any)?.status_code || undefined,
        url: (error as any)?.url || undefined,
      };
      
      dispatch(setLoginError(serializedError.message));
      dispatch(setAuthError(serializedError));
      return rejectWithValue(serializedError);
    } finally {
      dispatch(setLoggingIn(false));
    }
  }
);

export const logoutUser = createAsyncThunk<
  void,
  void,
  { rejectValue: APIError }
>(
  'auth/logout',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      await client.logout();
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      // Always clear local state
      localStorage.removeItem('mattermostToken');
      localStorage.removeItem('mattermostServerUrl');
      localStorage.removeItem('mattermostUser');
      
      // Clear auth cookies
      document.cookie = 'MMAUTHTOKEN=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'MMUSERID=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
      // Clear client token and URL
      client.setToken('');
      client.setUrl('');
      
      // Clear all Redux state
      dispatch(clearCurrentUser());
      dispatch(clearEntities());
      dispatch(clearViews());
      dispatch(clearAllErrors());
    }
  }
);

export const getCurrentUser = createAsyncThunk<
  UserProfile,
  void,
  { rejectValue: APIError }
>(
  'auth/getCurrentUser',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const user = await client.getMe();
      
      dispatch(setCurrentUserId(user.id));
      dispatch(setUser(user));
      
      return user;
    } catch (error) {
      const apiError = error as APIError;
      dispatch(setAuthError(apiError));
      
      // If unauthorized, clear auth state
      if (apiError.status_code === 401) {
        dispatch(logoutUser());
      }
      
      return rejectWithValue(apiError);
    }
  }
);


const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setServerUrl: (state, action) => {
      state.serverUrl = action.payload;
      if (action.payload) {
        localStorage.setItem('mattermostServerUrl', action.payload);
      } else {
        localStorage.removeItem('mattermostServerUrl');
      }
    },
    clearAuth: () => {
      localStorage.removeItem('mattermostToken');
      localStorage.removeItem('mattermostServerUrl');
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.serverUrl = action.payload.serverUrl;
      })
      .addCase(loginUser.rejected, (state) => {
        state.isAuthenticated = false;
        state.token = null;
      })
      
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.token = null;
        state.serverUrl = null;
      })
      
      // Get current user
      .addCase(getCurrentUser.fulfilled, (state) => {
        state.isAuthenticated = true;
      })
      .addCase(getCurrentUser.rejected, (state) => {
        // Keep auth state, error is handled in thunk
      })
  },
});

export const { setServerUrl, clearAuth } = authSlice.actions;
export default authSlice.reducer;
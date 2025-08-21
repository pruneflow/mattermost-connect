/**
 * Authentication slice for Mattermost login/logout
 * Handles user authentication state and session management
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { UserProfile, LoginRequest, LoginWithTokenRequest, APIError } from '../../api/types';
import { client } from '../../api/client';
import { imageService } from '../../services/imageService';
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
  isAuthenticated: false,
  token: null,
  serverUrl: localStorage.getItem('mattermostServerUrl'),
};

// Async thunks for auth actions
export const loginUser = createAsyncThunk<
  { user: UserProfile; token: string; serverUrl: string },
  (LoginRequest & { serverUrl: string }) | (LoginWithTokenRequest & { serverUrl: string }),
  { rejectValue: APIError }
>(
  'auth/login',
  async (credentials, { dispatch, rejectWithValue }) => {
    const { serverUrl } = credentials;
    try {
      dispatch(setLoggingIn(true));
      dispatch(setLoginError(null));
      dispatch(setAuthError(null));

      // Configure client
      client.setUrl(serverUrl);
      client.setIncludeCookies(true);
      
      if('token' in credentials) {
        client.setToken(credentials.token);
      }
      // Use token authentication if token is provided, otherwise use login/password
      const user = 'token' in credentials
        ? await client.getMe()
        : await client.login(credentials.login_id, credentials.password, '', false);

      // Get token exactly like Mattermost does
      const token = client.getToken();

      if (!user) {
        throw new Error('Login failed - no user returned');
      }

      // Store minimal data in localStorage for reconnection
      localStorage.setItem('mattermostServerUrl', serverUrl);
      localStorage.setItem('mattermostUser', JSON.stringify(user));
      
      // Cookies are set by server via Set-Cookie headers, not manually by client
      // This is the exact Mattermost behavior

      // Update entities
      dispatch(setCurrentUserId(user.id));
      dispatch(setUser(user));

      return { user, token: token || '', serverUrl };
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
      // Call logout API exactly like Mattermost
      await client.logout();
    } catch (error) {
      // Continue with logout even if API call fails (same as Mattermost)
    } finally {
      localStorage.removeItem('mattermostServerUrl');
      localStorage.removeItem('mattermostUser');
      
      // Cookies are cleared by server on logout, not manually by client
      // This is the exact Mattermost behavior
      
      // Clear client token (Mattermost doesn't clear URL on logout)
      client.setToken('');
      
      // Clear image cache to free memory
      imageService.clearCache();
      
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

/**
 * Restore authentication state from localStorage exactly like Mattermost
 * Called on app startup to restore user session
 */
export const restoreAuthFromStorage = createAsyncThunk<
  { user: UserProfile; token: string | null; serverUrl: string | null } | null,
  void,
  { rejectValue: string }
>(
  'auth/restoreFromStorage',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const serverUrl = localStorage.getItem('mattermostServerUrl');
      const userJson = localStorage.getItem('mattermostUser');

      if (!userJson || !serverUrl) {
        return null;
      }

      // Configure client
      client.setUrl(serverUrl);
      client.setIncludeCookies(true);

      // Validate session by attempting to get current user
      // This will use existing cookies or fail if session expired
      try {
        const currentUser = await client.getMe();
        
        dispatch(setCurrentUserId(currentUser.id));
        dispatch(setUser(currentUser));
        
        return { user: currentUser, token: null, serverUrl };
      } catch (sessionError) {
        dispatch(logoutUser());
        return rejectWithValue('Session expired or invalid');
      }
    } catch (error) {
      // Clear invalid state
      dispatch(logoutUser());
      return rejectWithValue('Failed to parse stored auth data');
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
      localStorage.removeItem('mattermostServerUrl');
      localStorage.removeItem('mattermostUser');
      return {
        isAuthenticated: false,
        token: null,
        serverUrl: null,
      };
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
      })
      
      // Get current user
      .addCase(getCurrentUser.fulfilled, (state) => {
        state.isAuthenticated = true;
      })
      .addCase(getCurrentUser.rejected, (state) => {
        // Keep auth state, error is handled in thunk
      })
      
      // Restore from storage
      .addCase(restoreAuthFromStorage.fulfilled, (state, action) => {
        if (action.payload) {
          state.isAuthenticated = true;
          state.token = action.payload.token;
          state.serverUrl = action.payload.serverUrl;
        }
      })
      .addCase(restoreAuthFromStorage.rejected, (state) => {
        // State already cleared in thunk
        state.isAuthenticated = false;
        state.token = null;
        state.serverUrl = null;
      })
  },
});

export const { setServerUrl, clearAuth } = authSlice.actions;
export default authSlice.reducer;
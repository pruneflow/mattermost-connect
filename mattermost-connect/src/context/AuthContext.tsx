import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { api } from '../api/client';
import { User, LoginCredentials } from '../api/types';

// Auth state interface
interface AuthState {
  isInitialized: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  serverUrl: string | null;
  error: Error | null;
}

// Initial state
const initialState: AuthState = {
  isInitialized: false,
  isAuthenticated: false,
  isLoading: false,
  user: null,
  token: null,
  serverUrl: null,
  error: null,
};

// Auth context type
interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<User | null>;
  updateUser: (updates: Partial<User>) => Promise<User>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Action types
type AuthAction =
  | { type: 'INITIALIZE_START' }
  | { type: 'INITIALIZE_SUCCESS'; payload: { user: User; token: string; serverUrl?: string } }
  | { type: 'INITIALIZE_FAILURE'; payload: { error: Error } }
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string; serverUrl?: string } }
  | { type: 'LOGIN_FAILURE'; payload: { error: Error } }
  | { type: 'LOGOUT' }
  | { type: 'SET_USER'; payload: { user: User } }
  | { type: 'UPDATE_USER_SUCCESS'; payload: { user: User } };

// Reducer function
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'INITIALIZE_START':
      return {
        ...state,
        isInitialized: false,
        isLoading: true,
        error: null,
      };
    case 'INITIALIZE_SUCCESS':
      return {
        ...state,
        isInitialized: true,
        isAuthenticated: true,
        isLoading: false,
        user: action.payload.user,
        token: action.payload.token,
        serverUrl: action.payload.serverUrl || state.serverUrl,
        error: null,
      };
    case 'INITIALIZE_FAILURE':
      return {
        ...state,
        isInitialized: true,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload.error,
      };
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        user: action.payload.user,
        token: action.payload.token,
        serverUrl: action.payload.serverUrl || state.serverUrl,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload.error,
      };
    case 'LOGOUT':
      return {
        ...initialState,
        isInitialized: true,
      };
    case 'SET_USER':
    case 'UPDATE_USER_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
      };
    default:
      return state;
  }
}

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  
  // Initialize authentication from stored credentials
  useEffect(() => {
    async function initializeAuth() {
      dispatch({ type: 'INITIALIZE_START' });
      
      try {
        // Check for stored token
        const token = localStorage.getItem('mattermost_token');
        const serverUrl = localStorage.getItem('mattermost_server');
        
        if (!token) {
          dispatch({ type: 'INITIALIZE_FAILURE', payload: { error: new Error('No token found') } });
          return;
        }
        
        // Configure API client
        if (serverUrl) {
          api.configure({
            serverUrl,
            token,
          });
        } else {
          api.setToken(token);
        }
        
        // Fetch current user
        const { data: user } = await api.get<User>('users/me');
        
        // Initialize successful
        dispatch({
          type: 'INITIALIZE_SUCCESS',
          payload: { user, token, serverUrl: serverUrl || null },
        });
      } catch (error) {
        // Clear invalid credentials
        localStorage.removeItem('mattermost_token');
        localStorage.removeItem('mattermost_server');
        
        dispatch({
          type: 'INITIALIZE_FAILURE',
          payload: { error: error as Error },
        });
      }
    }
    
    void initializeAuth();
  }, []);
  
  // Login function
  async function login(credentials: LoginCredentials): Promise<User> {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      // Configure API with server URL if provided
      if (credentials.serverUrl) {
        api.configure({
          serverUrl: credentials.serverUrl,
        });
      }
      
      // Login request
      const response = await api.post<User>('users/login', {
        login_id: credentials.username,
        password: credentials.password,
      });
      
      // Extract token from headers and user from response
      const token = response.headers['token'];
      const user = response.data;
      
      if (!token) {
        throw new Error('No token received from server');
      }
      
      // Update API client
      api.setToken(token);
      
      // Store credentials
      localStorage.setItem('mattermost_token', token);
      if (credentials.serverUrl) {
        localStorage.setItem('mattermost_server', credentials.serverUrl);
        
        // Set auth cookie for direct mode to allow image loading
        // This cookie will be used by the browser to authenticate image requests
        const now = new Date();
        const time = now.getTime();
        const expireTime = time + 1000*3600*24*30; // 30 jours
        now.setTime(expireTime);
        document.cookie = `MMAUTHTOKEN=${token}; path=/; expires=${now.toUTCString()}`;
        
        // Set user ID cookie if user object is available
        if (user && user.id) {
          document.cookie = `MMUSERID=${user.id}; path=/; SameSite=Lax`;
        }
      }
      
      // Update state
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user,
          token,
          serverUrl: credentials.serverUrl,
        },
      });
      
      return user;
    } catch (error) {
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: { error: error as Error },
      });
      
      throw error;
    }
  }
  
  // Logout function
  function logout() {
    // Clear token
    localStorage.removeItem('mattermost_token');
    localStorage.removeItem('mattermost_server');
    
    // Clear auth cookies
    document.cookie = 'MMAUTHTOKEN=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'MMUSERID=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    // Reset API client
    api.setToken(null);
    
    // Update state
    dispatch({ type: 'LOGOUT' });
  }
  
  // Refresh user data
  async function refreshUser(): Promise<User | null> {
    try {
      const { data: user } = await api.get<User>('users/me');
      
      dispatch({
        type: 'SET_USER',
        payload: { user },
      });
      
      return user;
    } catch (error) {
      // If authentication error, logout
      if ((error as Error).message.includes('401')) {
        logout();
      }
      
      return null;
    }
  }
  
  // Update user function
  async function updateUser(updates: Partial<User>): Promise<User> {
    try {
      if (!state.user) {
        throw new Error('No user logged in');
      }
      
      // Use the /users/me/patch endpoint instead
      const { data: updatedUser } = await api.put<User>('users/me/patch', updates);
      
      dispatch({
        type: 'UPDATE_USER_SUCCESS',
        payload: { user: updatedUser },
      });
      
      return updatedUser;
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  }

  // Context value
  const value = {
    ...state,
    login,
    logout,
    refreshUser,
    updateUser,
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook for using auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}
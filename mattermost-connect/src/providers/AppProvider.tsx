import React, { useEffect } from "react";
import { Provider } from "react-redux";
import { store } from "../store";
import { useAppInitialization } from "../hooks/useAppInitialization";
import { useAppSelector } from "../hooks/useAppSelector";
import { useAppDispatch } from "../hooks/useAppDispatch";
import { selectIsAuthenticated } from "../store/selectors";
import { restoreAuthFromStorage, loginUser, setServerUrl } from "../store/slices/authSlice";
import { ThemeProvider } from "./ThemeProvider";

interface AppInitializerProps {
  children: React.ReactNode;
  serverUrl?: string;
  token?: string;
}

/**
 * App initialization component - handles single initialization
 */
const AppInitializer: React.FC<AppInitializerProps> = ({
  children,
  serverUrl,
  token,
}) => {
  const dispatch = useAppDispatch();
  const { isInitialized } = useAppInitialization();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  useEffect(() => {
    const attemptConnection = async () => {
      if (serverUrl) {
        dispatch(setServerUrl(serverUrl));
      }

      if (serverUrl && token) {
        try {
          await dispatch(loginUser({ token, serverUrl }));
        } catch (error) {
          console.warn("Auto-login with token failed:", error);
        }
      } else {
        dispatch(restoreAuthFromStorage());
      }
    };

    attemptConnection();
  }, [dispatch, serverUrl, token]);

  // Only show loading if we're authenticated but not yet initialized
  // If not authenticated, let the app render (so LoginForm can be shown)
  if (isAuthenticated && !isInitialized) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        Initializing...
      </div>
    );
  }

  return <>{children}</>;
};

interface AppProviderProps {
  children: React.ReactNode;
  serverUrl?: string;
  token?: string;
}

/**
 * Complete app provider with Redux toolki store, theme, and initialization
 */
export const AppProvider: React.FC<AppProviderProps> = ({
  children,
  serverUrl,
  token,
}) => {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <AppInitializer serverUrl={serverUrl} token={token}>
          {children}
        </AppInitializer>
      </ThemeProvider>
    </Provider>
  );
};

export default AppProvider;

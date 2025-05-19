import React, { useState, useCallback } from 'react';
import { Box, CssBaseline, ThemeProvider, createTheme, Button, Container, Paper, Typography, TextField, CircularProgress } from '@mui/material';
import { MattermostProvider, useAuth, MattermostChat, UserAvatar, MessageContainer } from 'mattermost-connect';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#0058CC',
    },
    secondary: {
      main: '#4A154B',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Open Sans", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 4,
        },
      },
    },
  },
});

interface MattermostDemoProps {
  onLogout?: () => void;
  mockService?: any; // Service de mock pour le mode démo
}

function MattermostDemo({ onLogout, mockService }: MattermostDemoProps) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MattermostProvider>
        <MainContent />
      </MattermostProvider>
    </ThemeProvider>
  );
}

// Login form component
function LoginForm({ onLogin }: { onLogin: (credentials: any) => Promise<any> }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      await onLogin({
        username,
        password,
        serverUrl: serverUrl || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <TextField
        label="Server URL"
        variant="outlined"
        fullWidth
        margin="normal"
        value={serverUrl}
        onChange={(e) => setServerUrl(e.target.value)}
        placeholder="https://your-mattermost-server.com"
        helperText="Leave empty for demo mode"
      />
      
      <TextField
        label="Username or Email"
        variant="outlined"
        fullWidth
        margin="normal"
        required
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      
      <TextField
        label="Password"
        variant="outlined"
        fullWidth
        margin="normal"
        required
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      
      {error && (
        <Typography color="error" variant="body2" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}
      
      <Button
        type="submit"
        variant="contained"
        fullWidth
        size="large"
        sx={{ mt: 3 }}
        disabled={isLoading}
      >
        {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
      </Button>
      
      <Button
        variant="outlined"
        fullWidth
        size="large"
        sx={{ mt: 2 }}
        onClick={() => {
          setUsername('demo_user');
          setPassword('demo_password');
          setServerUrl('https://demo.mattermost.com');
        }}
      >
        Use Demo Credentials
      </Button>
    </form>
  );
}

// Main content with authentication handling
function MainContent() {
  // Get auth state from context
  const { isAuthenticated, isInitialized, isLoading, user, login, logout, status, updateStatus } = useAuth();
  
  // Team selection state
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  
  // If still initializing auth, show loading
  if (!isInitialized || isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={40} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading...
        </Typography>
      </Box>
    );
  }
  
  // If not authenticated, show login form
  if (!isAuthenticated || !user) {
    return (
      <Container maxWidth="sm" sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography variant="h4" align="center" gutterBottom>
            Mattermost Connect Demo
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
            Sign in to your Mattermost server
          </Typography>
          
          <LoginForm onLogin={login} />
        </Paper>
      </Container>
    );
  }
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>                
        {/* Main chat component */}
          <MattermostChat />
    </Box>
  );
}

export default MattermostDemo;
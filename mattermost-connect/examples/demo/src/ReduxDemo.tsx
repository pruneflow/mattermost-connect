import React from 'react';
import { Provider } from 'react-redux';
import { 
  store, 
  MattermostClient,
  setDefaultClient,
  LoginForm, 
  useAuth
} from 'mattermost-connect';

// Initialize the default client
const client = new MattermostClient({
  serverUrl: 'https://demo.mattermost.com' // Default demo server
});
setDefaultClient(client);

// Auth status component
const AuthStatus: React.FC = () => {
  const { isAuthenticated, currentUser, isLoggingIn, logout } = useAuth();

  if (isLoggingIn) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div>Authenticating...</div>
      </div>
    );
  }

  if (isAuthenticated && currentUser) {
    const successStyle: React.CSSProperties = {
      padding: '20px',
      backgroundColor: '#e8f5e8',
      border: '1px solid #4caf50',
      borderRadius: '8px',
      maxWidth: '500px',
      margin: '20px auto',
    };

    const titleStyle: React.CSSProperties = {
      fontSize: '20px',
      fontWeight: 600,
      color: '#2e7d32',
      margin: '0 0 12px 0',
    };

    const textStyle: React.CSSProperties = {
      color: '#388e3c',
      margin: '6px 0',
    };

    return (
      <div style={successStyle}>
        <h3 style={titleStyle}>
          ✅ Successfully connected to Mattermost!
        </h3>
        <p style={textStyle}><strong>Name:</strong> {currentUser.first_name} {currentUser.last_name}</p>
        <p style={textStyle}><strong>Username:</strong> @{currentUser.username}</p>
        <p style={textStyle}><strong>Email:</strong> {currentUser.email}</p>
        <button 
          onClick={logout}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            backgroundColor: '#d32f2f',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '500px', margin: '40px auto' }}>
      <LoginForm 
        onSuccess={() => {
          console.log('Login successful!');
        }}
      />
    </div>
  );
};

// Main demo component
const ReduxDemoContent: React.FC = () => {
  const containerStyle: React.CSSProperties = {
    padding: '20px',
    maxWidth: '900px',
    margin: '0 auto',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  };

  const headerStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: '40px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 8px 0',
  };

  const subtitleStyle: React.CSSProperties = {
    color: '#666',
    fontSize: '16px',
    margin: 0,
  };

  const featureBoxStyle: React.CSSProperties = {
    marginTop: '40px',
    padding: '24px',
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  };

  const featureTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '16px',
    color: '#333',
  };

  const listStyle: React.CSSProperties = {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  };

  const listItemStyle: React.CSSProperties = {
    color: '#666',
    marginBottom: '8px',
    fontSize: '14px',
    paddingLeft: '4px',
  };

  const codeBoxStyle: React.CSSProperties = {
    backgroundColor: '#f5f5f5',
    border: '1px solid #ddd',
    borderRadius: '6px',
    padding: '16px',
    fontFamily: 'Monaco, Consolas, monospace',
    fontSize: '13px',
    marginTop: '16px',
    overflow: 'auto',
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <h1 style={titleStyle}>
          MattermostConnect Redux
        </h1>
        <p style={subtitleStyle}>
          Phase 1: Redux Toolkit + RTK Query + Authentication
        </p>
      </header>
      
      <AuthStatus />
      
      <div style={featureBoxStyle}>
        <h3 style={featureTitleStyle}>✅ Phase 1 Features Implemented</h3>
        <ul style={listStyle}>
          <li style={listItemStyle}>✅ Redux Toolkit store with Mattermost architecture (entities/views/errors/auth)</li>
          <li style={listItemStyle}>✅ RTK Query API client with official Mattermost endpoints</li>
          <li style={listItemStyle}>✅ Auth slice with async login/logout thunks</li>
          <li style={listItemStyle}>✅ Atomic Design components (Button, TextInput, LoginForm)</li>
          <li style={listItemStyle}>✅ Typed React hooks (useAppSelector, useAppDispatch, useAuth)</li>
          <li style={listItemStyle}>✅ Authentication flow with token persistence</li>
          <li style={listItemStyle}>✅ CSS-in-JS styling compatible with MUI</li>
        </ul>
      </div>

      <div style={featureBoxStyle}>
        <h3 style={featureTitleStyle}>🚀 Simple Integration</h3>
        <p style={{ color: '#666', marginBottom: '12px' }}>
          Just 3 lines to integrate in your React app:
        </p>
        <div style={codeBoxStyle}>
{`import { store, MattermostClient, setDefaultClient, LoginForm } from 'mattermost-connect';
import { Provider } from 'react-redux';

// Setup
const client = new MattermostClient({ 
  serverUrl: 'https://your-mattermost.com' 
});
setDefaultClient(client);

// Use
<Provider store={store}>
  <LoginForm />
</Provider>`}
        </div>
      </div>

      <div style={featureBoxStyle}>
        <h3 style={featureTitleStyle}>🏗️ Next Phases</h3>
        <ul style={listStyle}>
          <li style={listItemStyle}>⏳ Phase 2: Teams + User Management</li>
          <li style={listItemStyle}>⏳ Phase 3: Channels + Navigation</li>
          <li style={listItemStyle}>⏳ Phase 4: Messages + Core Chat</li>
          <li style={listItemStyle}>⏳ Phase 5: Threads + WebSocket Real-time</li>
          <li style={listItemStyle}>⏳ Phase 6: Polish + Performance + Mobile</li>
        </ul>
      </div>
    </div>
  );
};

// Redux demo with provider
const ReduxDemo: React.FC = () => {
  const appStyle: React.CSSProperties = {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
  };

  return (
    <Provider store={store}>
      <div style={appStyle}>
        <ReduxDemoContent />
      </div>
    </Provider>
  );
};

export default ReduxDemo;
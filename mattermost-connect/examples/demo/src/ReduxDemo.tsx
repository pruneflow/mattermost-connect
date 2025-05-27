import React, { useState } from 'react';
import { Provider } from 'react-redux';
import { Box, Typography } from '@mui/material';
import { 
  store,
  LoginForm, 
  TeamList,
  UserMenu,
  UserAvatar,
  useAuth,
  useTeams
} from 'mattermost-connect';

// Phase 2 Demo Component - Teams & User Management
const Phase2Demo: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { teams, currentTeam, switchTeam } = useTeams(); // No manual loading needed
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // No manual data loading - handled automatically by useAuth


  const handleTeamSelect = (team: any) => {
    setSelectedTeamId(team.id);
    switchTeam(team.id);
  };

  return (
    <Box sx={{
      p: 2.5,
      backgroundColor: '#fff',
      border: '1px solid #ddd',
      borderRadius: 2,
      margin: '20px auto',
      maxWidth: '800px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    }}>
      {/* Header with User Info */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 2.5,
        p: 2,
        backgroundColor: '#f8f9fa',
        borderRadius: 1,
      }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}>
          <UserAvatar user={currentUser} size="medium" />
          <Box>
            <Typography sx={{ fontWeight: 'bold' }}>
              {currentUser?.first_name} {currentUser?.last_name}
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#666' }}>
              @{currentUser?.username}
            </Typography>
          </Box>
        </Box>
        <UserMenu 
          user={currentUser} 
          onLogout={logout}
          size="medium"
          showStatus={true}
        />
      </Box>

      {/* Phase 2 Components Demo */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 2.5,
        mt: 2.5,
      }}>
        {/* Teams Section */}
        <Box sx={{
          p: 2,
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          backgroundColor: '#fafafa',
        }}>
          <Typography variant="h6" sx={{ mt: 0, color: '#333' }}>Teams</Typography>
          {teams && teams.length > 0 ? (
            <TeamList 
              teams={teams}
              selectedTeamId={selectedTeamId}
              onTeamSelect={handleTeamSelect}
              layout="vertical"
            />
          ) : (
            <Box sx={{ textAlign: 'center', p: 2.5, color: '#666' }}>
              Loading teams...
            </Box>
          )}
        </Box>

        {/* Current Team Info */}
        <Box sx={{
          p: 2,
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          backgroundColor: '#fafafa',
        }}>
          <Typography variant="h6" sx={{ mt: 0, color: '#333' }}>Current Team</Typography>
          {currentTeam ? (
            <Box>
              <Typography sx={{ mb: 1 }}>
                <strong>Name:</strong> {currentTeam.display_name}
              </Typography>
              <Typography sx={{ mb: 1 }}>
                <strong>Description:</strong> {currentTeam.description || 'No description'}
              </Typography>
              <Typography sx={{ fontSize: '12px', color: '#666' }}>
                ID: {currentTeam.id}
              </Typography>
            </Box>
          ) : (
            <Typography sx={{ color: '#666' }}>No team selected</Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

// Auth status component
const AuthStatus: React.FC = () => {
  const { isAuthenticated, currentUser, isLoggingIn } = useAuth();

  if (isLoggingIn) {
    return (
      <Box sx={{ textAlign: 'center', p: 2.5 }}>
        <Typography>Authenticating...</Typography>
      </Box>
    );
  }

  if (isAuthenticated && currentUser) {
    return (
      <>
        <Box sx={{
          p: 2.5,
          backgroundColor: '#e8f5e8',
          border: '1px solid #4caf50',
          borderRadius: 2,
          maxWidth: '800px',
          margin: '20px auto',
          textAlign: 'center',
        }}>
          <Typography variant="h5" sx={{
            fontWeight: 600,
            color: '#2e7d32',
            mb: 1.5,
          }}>
            ✅ Successfully connected to Mattermost!
          </Typography>
          <Typography sx={{ color: '#388e3c', my: 0.75 }}>
            Welcome {currentUser.first_name} {currentUser.last_name} (@{currentUser.username})
          </Typography>
        </Box>
        <Phase2Demo />
      </>
    );
  }

  return (
    <div style={{ maxWidth: '500px', margin: '40px auto' }}>
      <LoginForm onSuccess={() => console.log('Login successful!')} />
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
          Phase 2: Teams + User Management (Built on Redux + Client4)
        </p>
      </header>
      
      <AuthStatus />
      
      <div style={featureBoxStyle}>
        <h3 style={featureTitleStyle}>✅ Phase 2 Features Implemented</h3>
        <ul style={listStyle}>
          <li style={listItemStyle}>✅ Atoms: UserAvatar, StatusBadge, UnreadBadge, Dropdown</li>
          <li style={listItemStyle}>✅ Molecules: UserCard, TeamItem, StatusSelector</li>
          <li style={listItemStyle}>✅ Organisms: TeamList, UserMenu, UserProfileComponent</li>
          <li style={listItemStyle}>✅ Hooks: useTeams, useUsers, useUserStatus</li>
          <li style={listItemStyle}>✅ Redux integration with Client4 from mattermost-redux</li>
          <li style={listItemStyle}>✅ Teams management with switching capabilities</li>
          <li style={listItemStyle}>✅ User management and status handling</li>
          <li style={listItemStyle}>✅ Complete TypeScript typing</li>
        </ul>
      </div>

      <div style={featureBoxStyle}>
        <h3 style={featureTitleStyle}>🚀 Simple Integration</h3>
        <p style={{ color: '#666', marginBottom: '12px' }}>
          Just 3 lines to integrate in your React app:
        </p>
        <div style={codeBoxStyle}>
{`import { 
  store, 
  setDefaultClient, 
  LoginForm,
  TeamList,
  UserMenu,
  UserAvatar,
  useTeams,
  useUsers 
} from 'mattermost-connect';
import { Provider } from 'react-redux';

// Setup Client4
setDefaultClient({ 
  serverUrl: 'https://your-mattermost.com' 
});

// Use
<Provider store={store}>
  <LoginForm />
  <TeamList teams={teams} onTeamSelect={handleTeamSelect} />
  <UserMenu user={user} onLogout={logout} />
</Provider>`}
        </div>
      </div>

      <div style={featureBoxStyle}>
        <h3 style={featureTitleStyle}>🏗️ Next Phases</h3>
        <ul style={listStyle}>
          <li style={listItemStyle}>✅ Phase 1: Redux Toolkit + RTK Query + Authentication</li>
          <li style={listItemStyle}>✅ Phase 2: Teams + User Management</li>
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
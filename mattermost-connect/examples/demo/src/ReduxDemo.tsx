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
    <Box sx={{ maxWidth: '500px', margin: '40px auto' }}>
      <LoginForm onSuccess={() => console.log('Login successful!')} />
    </Box>
  );
};

// Main demo component
const ReduxDemoContent: React.FC = () => {


  return (
    <Box sx={{
      p: 2.5,
      maxWidth: '900px',
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <Box component="header" sx={{
        textAlign: 'center',
        mb: 5,
      }}>
        <Typography variant="h3" component="h1" sx={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#333',
          mb: 1,
        }}>
          MattermostConnect Redux
        </Typography>
        <Typography sx={{
          color: '#666',
          fontSize: '16px',
          m: 0,
        }}>
          Phase 2: Teams + User Management (Built on Redux + Client4)
        </Typography>
      </Box>
      
      <AuthStatus />
      
      <Box sx={{
        mt: 5,
        p: 3,
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: 2,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}>
        <Typography variant="h6" sx={{
          fontSize: '18px',
          fontWeight: 600,
          mb: 2,
          color: '#333',
        }}>✅ Phase 2 Features Implemented</Typography>
        <Box component="ul" sx={{
          listStyle: 'none',
          p: 0,
          m: 0,
        }}>
          <Typography component="li" sx={{
            color: '#666',
            mb: 1,
            fontSize: '14px',
            pl: 0.5,
          }}>✅ Atoms: UserAvatar, StatusBadge, UnreadBadge, Dropdown</Typography>
          <Typography component="li" sx={{
            color: '#666',
            mb: 1,
            fontSize: '14px',
            pl: 0.5,
          }}>✅ Molecules: UserCard, TeamItem, StatusSelector</Typography>
          <Typography component="li" sx={{
            color: '#666',
            mb: 1,
            fontSize: '14px',
            pl: 0.5,
          }}>✅ Organisms: TeamList, UserMenu, UserProfileComponent</Typography>
          <Typography component="li" sx={{
            color: '#666',
            mb: 1,
            fontSize: '14px',
            pl: 0.5,
          }}>✅ Hooks: useTeams, useUsers, useUserStatus</Typography>
          <Typography component="li" sx={{
            color: '#666',
            mb: 1,
            fontSize: '14px',
            pl: 0.5,
          }}>✅ Redux integration with Client4 from mattermost-redux</Typography>
          <Typography component="li" sx={{
            color: '#666',
            mb: 1,
            fontSize: '14px',
            pl: 0.5,
          }}>✅ Teams management with switching capabilities</Typography>
          <Typography component="li" sx={{
            color: '#666',
            mb: 1,
            fontSize: '14px',
            pl: 0.5,
          }}>✅ User management and status handling</Typography>
          <Typography component="li" sx={{
            color: '#666',
            mb: 1,
            fontSize: '14px',
            pl: 0.5,
          }}>✅ Complete TypeScript typing</Typography>
        </Box>
      </Box>

      <Box sx={{
        mt: 5,
        p: 3,
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: 2,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}>
        <Typography variant="h6" sx={{
          fontSize: '18px',
          fontWeight: 600,
          mb: 2,
          color: '#333',
        }}>🚀 Simple Integration</Typography>
        <Typography sx={{ color: '#666', mb: 1.5 }}>
          Just 3 lines to integrate in your React app:
        </Typography>
        <Box sx={{
          backgroundColor: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: 1,
          p: 2,
          fontFamily: 'Monaco, Consolas, monospace',
          fontSize: '13px',
          mt: 2,
          overflow: 'auto',
        }}>
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
        </Box>
      </Box>

      <Box sx={{
        mt: 5,
        p: 3,
        backgroundColor: 'white',
        border: '1px solid #ddd',
        borderRadius: 2,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}>
        <Typography variant="h6" sx={{
          fontSize: '18px',
          fontWeight: 600,
          mb: 2,
          color: '#333',
        }}>🏗️ Next Phases</Typography>
        <Box component="ul" sx={{
          listStyle: 'none',
          p: 0,
          m: 0,
        }}>
          <Typography component="li" sx={{
            color: '#666',
            mb: 1,
            fontSize: '14px',
            pl: 0.5,
          }}>✅ Phase 1: Redux Toolkit + RTK Query + Authentication</Typography>
          <Typography component="li" sx={{
            color: '#666',
            mb: 1,
            fontSize: '14px',
            pl: 0.5,
          }}>✅ Phase 2: Teams + User Management</Typography>
          <Typography component="li" sx={{
            color: '#666',
            mb: 1,
            fontSize: '14px',
            pl: 0.5,
          }}>⏳ Phase 3: Channels + Navigation</Typography>
          <Typography component="li" sx={{
            color: '#666',
            mb: 1,
            fontSize: '14px',
            pl: 0.5,
          }}>⏳ Phase 4: Messages + Core Chat</Typography>
          <Typography component="li" sx={{
            color: '#666',
            mb: 1,
            fontSize: '14px',
            pl: 0.5,
          }}>⏳ Phase 5: Threads + WebSocket Real-time</Typography>
          <Typography component="li" sx={{
            color: '#666',
            mb: 1,
            fontSize: '14px',
            pl: 0.5,
          }}>⏳ Phase 6: Polish + Performance + Mobile</Typography>
        </Box>
      </Box>
    </Box>
  );
};

// Redux demo with provider
const ReduxDemo: React.FC = () => {
  return (
    <Provider store={store}>
      <Box sx={{
        minHeight: '100vh',
        backgroundColor: '#f8f9fa',
      }}>
        <ReduxDemoContent />
      </Box>
    </Provider>
  );
};

export default ReduxDemo;
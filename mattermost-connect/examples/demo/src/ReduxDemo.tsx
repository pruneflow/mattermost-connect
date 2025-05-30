import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { 
  LoginForm, 
  TeamList,
  UserMenu,
  UserAvatar,
  useAuth,
  useTeams,
  AppProvider
} from 'mattermost-connect';

// Phase 2 Demo Component - Teams & User Management
const Phase2Demo: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { currentTeam } = useTeams();


  return (
    <Box sx={{
      p: { xs: 1.5, sm: 2.5 },
      bgcolor: 'background.paper',
      border: 1,
      borderColor: 'divider',
      borderRadius: 2,
      margin: { xs: '10px', sm: '20px auto' },
      maxWidth: { xs: '100%', sm: '800px' },
      boxShadow: 1,
      minWidth: 0,
    }}>
      {/* Header with User Info */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 2.5,
        p: { xs: 1.5, sm: 2 },
        bgcolor: 'action.hover',
        borderRadius: 1,
        minWidth: 0,
      }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          minWidth: 0,
          flex: 1,
        }}>
          <UserAvatar user={currentUser} size="medium" />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontWeight: 'bold', noWrap: true }}>
              {currentUser?.first_name} {currentUser?.last_name}
            </Typography>
            <Typography sx={{ fontSize: '14px', color: 'text.secondary', noWrap: true }}>
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
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        gap: 2.5,
        mt: 2.5,
      }}>
        {/* Teams Section */}
        <Box sx={{
          p: 2,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.paper',
          minWidth: 0,
        }}>
          <Typography variant="h6" sx={{ mt: 0, color: 'text.primary' }}>Teams</Typography>
          <TeamList
            layout="vertical"
          />
        </Box>

        {/* Current Team Info */}
        <Box sx={{
          p: 2,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.paper',
          minWidth: 0,
        }}>
          <Typography variant="h6" sx={{ mt: 0, color: 'text.primary' }}>Current Team</Typography>
          {currentTeam ? (
            <Box>
              <Typography sx={{ mb: 1, wordBreak: 'break-word' }}>
                <strong>Name:</strong> {currentTeam.display_name}
              </Typography>
              <Typography sx={{ mb: 1, wordBreak: 'break-word' }}>
                <strong>Description:</strong> {currentTeam.description || 'No description'}
              </Typography>
              <Typography sx={{ fontSize: '12px', color: 'text.secondary', wordBreak: 'break-all' }}>
                ID: {currentTeam.id}
              </Typography>
            </Box>
          ) : (
            <Typography sx={{ color: 'text.secondary' }}>No team selected</Typography>
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
          bgcolor: 'success.light',
          border: 1,
          borderColor: 'success.main',
          borderRadius: 2,
          maxWidth: { xs: '100%', sm: '800px' },
          margin: { xs: '10px', sm: '20px auto' },
          textAlign: 'center',
          minWidth: 0,
        }}>
          <Typography variant="h5" sx={{
            fontWeight: 600,
            color: 'text.primary',
            mb: 1.5,
          }}>
            ✅ Successfully connected to Mattermost!
          </Typography>
          <Typography sx={{ color: 'text.secondary', my: 0.75, wordBreak: 'break-word' }}>
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
          color: 'text.primary',
          mb: 1,
        }}>
          MattermostConnect Redux
        </Typography>
        <Typography sx={{
          color: 'text.secondary',
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
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        boxShadow: 1,
      }}>
        <Typography variant="h6" sx={{
          fontSize: '18px',
          fontWeight: 600,
          mb: 2,
          color: 'text.primary',
        }}>✅ Phase 2 Features Implemented</Typography>
        <Box component="ul" sx={{
          listStyle: 'none',
          p: 0,
          m: 0,
        }}>
          <Typography component="li" sx={{
            color: 'text.secondary',
            mb: 1,
            fontSize: '14px',
            pl: 0.5,
          }}>✅ Atoms: UserAvatar, StatusBadge, UnreadBadge, Dropdown</Typography>
          <Typography component="li" sx={{
            color: 'text.secondary',
            mb: 1,
            fontSize: '14px',
            pl: 0.5,
          }}>✅ Molecules: UserCard, TeamItem, StatusSelector</Typography>
          <Typography component="li" sx={{
            color: 'text.secondary',
            mb: 1,
            fontSize: '14px',
            pl: 0.5,
          }}>✅ Organisms: TeamList, UserMenu, UserProfileComponent</Typography>
          <Typography component="li" sx={{
            color: 'text.secondary',
            mb: 1,
            fontSize: '14px',
            pl: 0.5,
          }}>✅ Hooks: useTeams, useUsers, useUserStatus</Typography>
          <Typography component="li" sx={{
            color: 'text.secondary',
            mb: 1,
            fontSize: '14px',
            pl: 0.5,
          }}>✅ Redux integration with Client4 from mattermost-redux</Typography>
          <Typography component="li" sx={{
            color: 'text.secondary',
            mb: 1,
            fontSize: '14px',
            pl: 0.5,
          }}>✅ Teams management with switching capabilities</Typography>
          <Typography component="li" sx={{
            color: 'text.secondary',
            mb: 1,
            fontSize: '14px',
            pl: 0.5,
          }}>✅ User management and status handling</Typography>
          <Typography component="li" sx={{
            color: 'text.secondary',
            mb: 1,
            fontSize: '14px',
            pl: 0.5,
          }}>✅ Complete TypeScript typing</Typography>
        </Box>
      </Box>

      <Box sx={{
        mt: 5,
        p: 3,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        boxShadow: 1,
      }}>
        <Typography variant="h6" sx={{
          fontSize: '18px',
          fontWeight: 600,
          mb: 2,
          color: 'text.primary',
        }}>🚀 Simple Integration</Typography>
        <Typography sx={{ color: '#666', mb: 1.5 }}>
          Just 3 lines to integrate in your React app:
        </Typography>
        <Box sx={{
          bgcolor: 'action.hover',
          border: 1,
          borderColor: 'divider',
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
  <TeamList teams={teams}  />
  <UserMenu user={user} onLogout={logout} />
</Provider>`}
        </Box>
      </Box>

      <Box sx={{
        mt: 5,
        p: 3,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        boxShadow: 1,
      }}>
        <Typography variant="h6" sx={{
          fontSize: '18px',
          fontWeight: 600,
          mb: 2,
          color: 'text.primary',
        }}>🏗️ Next Phases</Typography>
        <Box component="ul" sx={{
          listStyle: 'none',
          p: 0,
          m: 0,
        }}>
          <Typography component="li" sx={{
            color: 'text.secondary',
            mb: 1,
            fontSize: '14px',
            pl: 0.5,
          }}>✅ Phase 1: Redux Toolkit + RTK Query + Authentication</Typography>
          <Typography component="li" sx={{
            color: 'text.secondary',
            mb: 1,
            fontSize: '14px',
            pl: 0.5,
          }}>✅ Phase 2: Teams + User Management</Typography>
          <Typography component="li" sx={{
            color: 'text.secondary',
            mb: 1,
            fontSize: '14px',
            pl: 0.5,
          }}>⏳ Phase 3: Channels + Navigation</Typography>
          <Typography component="li" sx={{
            color: 'text.secondary',
            mb: 1,
            fontSize: '14px',
            pl: 0.5,
          }}>⏳ Phase 4: Messages + Core Chat</Typography>
          <Typography component="li" sx={{
            color: 'text.secondary',
            mb: 1,
            fontSize: '14px',
            pl: 0.5,
          }}>⏳ Phase 5: Threads + WebSocket Real-time</Typography>
          <Typography component="li" sx={{
            color: 'text.secondary',
            mb: 1,
            fontSize: '14px',
            pl: 0.5,
          }}>⏳ Phase 6: Polish + Performance + Mobile</Typography>
        </Box>
      </Box>
    </Box>
  );
};

// Redux demo with AppProvider (includes store + theme + initialization)
const ReduxDemo: React.FC = () => {
  return (
    <AppProvider>
      <Box sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}>
        <ReduxDemoContent />
      </Box>
    </AppProvider>
  );
};

export default ReduxDemo;
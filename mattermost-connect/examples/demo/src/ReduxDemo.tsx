import React, { useState, useEffect } from 'react';
import { Provider } from 'react-redux';
import { 
  store,
  LoginForm, 
  TeamList,
  UserMenu,
  UserAvatar,
  useAuth,
  useTeams,
  useUsers
} from 'mattermost-connect';

// Phase 2 Demo Component - Teams & User Management
const Phase2Demo: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { teams, currentTeam, switchTeam, loadTeams } = useTeams();
  const { loadUsers } = useUsers();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // Load data when component mounts
  useEffect(() => {
    if (currentUser) {
      loadTeams();
      loadUsers();
    }
  }, [currentUser, loadTeams, loadUsers]);

  const demoStyle: React.CSSProperties = {
    padding: '20px',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    margin: '20px auto',
    maxWidth: '800px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
  };

  const userInfoStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  };

  const contentStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginTop: '20px',
  };

  const sectionStyle: React.CSSProperties = {
    padding: '16px',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    backgroundColor: '#fafafa',
  };

  const handleTeamSelect = (team: any) => {
    setSelectedTeamId(team.id);
    switchTeam(team.id);
  };

  return (
    <div style={demoStyle}>
      {/* Header with User Info */}
      <div style={headerStyle}>
        <div style={userInfoStyle}>
          <UserAvatar user={currentUser} size="medium" />
          <div>
            <div style={{ fontWeight: 'bold' }}>
              {currentUser?.first_name} {currentUser?.last_name}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              @{currentUser?.username}
            </div>
          </div>
        </div>
        <UserMenu 
          user={currentUser} 
          onLogout={logout}
          size="medium"
          showStatus={true}
        />
      </div>

      {/* Phase 2 Components Demo */}
      <div style={contentStyle}>
        {/* Teams Section */}
        <div style={sectionStyle}>
          <h3 style={{ marginTop: 0, color: '#333' }}>Teams</h3>
          {teams && teams.length > 0 ? (
            <TeamList 
              teams={teams}
              selectedTeamId={selectedTeamId}
              onTeamSelect={handleTeamSelect}
              layout="vertical"
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              Loading teams...
            </div>
          )}
        </div>

        {/* Current Team Info */}
        <div style={sectionStyle}>
          <h3 style={{ marginTop: 0, color: '#333' }}>Current Team</h3>
          {currentTeam ? (
            <div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Name:</strong> {currentTeam.display_name}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Description:</strong> {currentTeam.description || 'No description'}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                ID: {currentTeam.id}
              </div>
            </div>
          ) : (
            <div style={{ color: '#666' }}>No team selected</div>
          )}
        </div>
      </div>
    </div>
  );
};

// Auth status component
const AuthStatus: React.FC = () => {
  const { isAuthenticated, currentUser, isLoggingIn } = useAuth();

  if (isLoggingIn) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div>Authenticating...</div>
      </div>
    );
  }

  if (isAuthenticated && currentUser) {
    return (
      <>
        <div style={{
          padding: '20px',
          backgroundColor: '#e8f5e8',
          border: '1px solid #4caf50',
          borderRadius: '8px',
          maxWidth: '800px',
          margin: '20px auto',
          textAlign: 'center',
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#2e7d32',
            margin: '0 0 12px 0',
          }}>
            ✅ Successfully connected to Mattermost!
          </h3>
          <p style={{ color: '#388e3c', margin: '6px 0' }}>
            Welcome {currentUser.first_name} {currentUser.last_name} (@{currentUser.username})
          </p>
        </div>
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
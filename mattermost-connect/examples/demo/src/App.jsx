import React, { useState } from "react";
import {
  MattermostProvider,
  ChannelList,
  ChannelViewer,
  MessageComposer,
  useMattermost,
} from "mattermost-connect";
import { createMockService } from "./mockService";
import "./App.css";

// Configuration pour le fournisseur de service simulé
const mockServiceProvider = {
  setupService: () => createMockService(),
  isConnected: true,
};

const App = () => {
  return (
    <div className="app">
      <header className="app-header">
        <h1>MattermostConnect Demo</h1>
        <p>Démonstration interactive en mode simulation</p>
      </header>

      <main className="app-main">
        {/* Utiliser notre propre provider avec le service simulé */}
        <MattermostProvider serviceProvider={mockServiceProvider}>
          <MattermostInterface />
        </MattermostProvider>
      </main>

      <footer className="app-footer">
        <p>MattermostConnect v0.1.0 - Mode démo sans serveur réel</p>
      </footer>
    </div>
  );
};

// Interface principale avec Mattermost
const MattermostInterface = () => {
  const { isConnected, currentUser, service } = useMattermost();
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Charger les équipes au montage
  React.useEffect(() => {
    const loadTeams = async () => {
      if (!isConnected) return;

      try {
        const teamsData = await service.getTeams();
        setTeams(teamsData);

        // Sélectionner automatiquement la première équipe
        if (teamsData.length > 0) {
          setSelectedTeam(teamsData[0]);
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Erreur lors du chargement des équipes:", error);
        setIsLoading(false);
      }
    };

    loadTeams();
  }, [isConnected, service]);

  // Gérer le changement d'équipe
  const handleTeamChange = (e) => {
    const teamId = e.target.value;
    const team = teams.find((t) => t.id === teamId);
    setSelectedTeam(team);
    setSelectedChannel(null);
  };

  // Gérer la sélection d'un canal
  const handleChannelSelect = (channel) => {
    setSelectedChannel(channel);
  };

  // Afficher le chargement
  if (isLoading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="mattermost-interface">
      <div className="interface-header">
        <div className="user-info">
          {currentUser && (
            <>
              <span className="avatar">
                {currentUser.first_name?.[0] || "U"}
              </span>
              <span className="username">
                {currentUser.first_name} {currentUser.last_name}
              </span>
            </>
          )}
        </div>

        <div className="team-selector">
          <label htmlFor="team-select">Équipe:</label>
          <select
            id="team-select"
            value={selectedTeam?.id || ""}
            onChange={handleTeamChange}
          >
            <option value="" disabled>
              Sélectionner une équipe
            </option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.display_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="interface-content">
        {selectedTeam && (
          <>
            <div className="channel-sidebar">
              <ChannelList
                teamId={selectedTeam.id}
                selectedChannelId={selectedChannel?.id}
                onSelectChannel={handleChannelSelect}
                showSearch={true}
              />
            </div>

            <div className="message-area">
              {selectedChannel ? (
                <>
                  <div className="messages-container">
                    <ChannelViewer
                      channelId={selectedChannel.id}
                      showHeader={true}
                    />
                  </div>

                  <div className="composer-container">
                    <MessageComposer
                      channelId={selectedChannel.id}
                      placeholder={`Message dans #${selectedChannel.display_name}`}
                      allowAttachments={true}
                    />
                  </div>
                </>
              ) : (
                <div className="no-channel">
                  <p>Sélectionnez un canal pour commencer à discuter</p>
                </div>
              )}
            </div>
          </>
        )}

        {!selectedTeam && (
          <div className="no-team">
            <div className="empty-state">
              <h2>Bienvenue dans MattermostConnect Demo</h2>
              <p>Veuillez sélectionner une équipe pour commencer</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;

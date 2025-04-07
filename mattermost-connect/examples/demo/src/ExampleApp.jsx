// examples/ExampleApp.js
import React, { useState, useEffect } from "react";
import {
  MattermostProvider,
  useMattermost,
  ChannelList,
  ChannelViewer,
  MessageComposer,
  MattermostAPI,
} from "mattermost-connect";

import "./ExampleApp.css";

// Composant d'application d'exemple
const ExampleApp = () => {
  const [mode, setMode] = useState("direct"); // 'direct' ou 'proxy'
  const [serverUrl, setServerUrl] = useState("");
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [proxyUrl, setProxyUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [userId, setUserId] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Fonction pour se connecter en mode direct
  const handleDirectLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    try {
      // Si un token est déjà fourni, l'utiliser directement
      if (token) {
        setIsAuthenticated(true);
        return;
      }

      // Sinon, générer un token avec les identifiants
      if (username && password && serverUrl) {
        const newToken = await MattermostAPI.createUserToken({
          serverUrl,
          username,
          password,
        });

        setToken(newToken);
        setIsAuthenticated(true);
      } else {
        setErrorMessage("Veuillez fournir toutes les informations requises");
      }
    } catch (error) {
      setErrorMessage(`Erreur d'authentification: ${error.message}`);
    }
  };

  // Fonction pour se connecter en mode proxy
  const handleProxyLogin = (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (proxyUrl && clientId && userId) {
      setIsAuthenticated(true);
    } else {
      setErrorMessage("Veuillez fournir toutes les informations requises");
    }
  };

  // Déconnexion
  const handleLogout = () => {
    setIsAuthenticated(false);
    setToken("");
    setPassword(""); // Effacer le mot de passe pour des raisons de sécurité
  };

  // Rendu du formulaire de connexion
  const renderLoginForm = () => {
    if (mode === "direct") {
      return (
        <form onSubmit={handleDirectLogin} className="login-form">
          <h2>Connexion Mode Direct</h2>

          <div className="form-group">
            <label>URL du serveur Mattermost</label>
            <input
              type="url"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="ex: https://mattermost.example.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Option de connexion</label>
            <div className="toggle-group">
              <button
                type="button"
                className={!token ? "active" : ""}
                onClick={() => setToken("")}
              >
                Par identifiants
              </button>
              <button
                type="button"
                className={token ? "active" : ""}
                onClick={() => {
                  setUsername("");
                  setPassword("");
                }}
              >
                Par token
              </button>
            </div>
          </div>

          {token ? (
            <div className="form-group">
              <label>Token API</label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Token d'accès personnel"
                required
              />
            </div>
          ) : (
            <>
              <div className="form-group">
                <label>Nom d'utilisateur ou Email</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <button type="submit" className="submit-button">
            Se connecter
          </button>
        </form>
      );
    } else {
      return (
        <form onSubmit={handleProxyLogin} className="login-form">
          <h2>Connexion Mode Proxy</h2>

          <div className="form-group">
            <label>URL du service proxy</label>
            <input
              type="url"
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
              placeholder="ex: https://proxy.votreservice.com"
              required
            />
          </div>

          <div className="form-group">
            <label>ID Client</label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>ID Utilisateur</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="submit-button">
            Se connecter
          </button>
        </form>
      );
    }
  };

  // Si l'utilisateur n'est pas authentifié, afficher le formulaire de connexion
  if (!isAuthenticated) {
    return (
      <div className="example-app">
        <div className="mode-toggle">
          <button
            className={mode === "direct" ? "active" : ""}
            onClick={() => setMode("direct")}
          >
            Mode Direct
          </button>
          <button
            className={mode === "proxy" ? "active" : ""}
            onClick={() => setMode("proxy")}
          >
            Mode Proxy
          </button>
        </div>

        {errorMessage && <div className="error-message">{errorMessage}</div>}

        {renderLoginForm()}
      </div>
    );
  }
  console.debug("mode", mode);
  console.debug("serverUrl", serverUrl);
  console.debug("token", token);
  // Si l'utilisateur est authentifié, afficher l'interface Mattermost
  return (
    <MattermostProvider
      // Configuration Mode Direct
      serverUrl={mode === "direct" ? serverUrl : undefined}
      token={mode === "direct" ? token : undefined}
      // Configuration Mode Proxy
      proxyUrl={mode === "proxy" ? proxyUrl : undefined}
      clientId={mode === "proxy" ? clientId : undefined}
      userId={mode === "proxy" ? userId : undefined}
      // Options communes
      enableWebsocket={true}
    >
      <MattermostInterface onLogout={handleLogout} />
    </MattermostProvider>
  );
};

// Composant pour l'interface principale
const MattermostInterface = ({ onLogout }) => {
  const { isConnected, currentUser, error, mode } = useMattermost();
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Utiliser le hook pour accéder au service Mattermost
  const { service } = useMattermost();

  // Charger les équipes de l'utilisateur
  useEffect(() => {
    if (!isConnected) return;

    const fetchTeams = async () => {
      try {
        const teamsData = await service.getTeams();
        setTeams(teamsData);

        // Sélectionner automatiquement la première équipe
        if (teamsData.length > 0 && !selectedTeam) {
          setSelectedTeam(teamsData[0]);
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Erreur lors du chargement des équipes:", err);
        setIsLoading(false);
      }
    };

    fetchTeams();
  }, [isConnected, service, selectedTeam]);

  // Gérer les erreurs ou l'état de chargement
  if (error) {
    return (
      <div className="error-container">
        <h3>Erreur de connexion</h3>
        <p>{error.message}</p>
        <button onClick={onLogout}>Retour</button>
      </div>
    );
  }

  if (isLoading || !isConnected) {
    return <div className="loading">Chargement de l'interface...</div>;
  }

  // Rendu de l'interface principale
  return (
    <div className="mattermost-interface">
      <header className="app-header">
        <div className="user-info">
          <span className="username">
            {currentUser?.first_name} {currentUser?.last_name}
          </span>
          <span className="user-status">En ligne</span>
        </div>

        <div className="header-actions">
          <select
            value={selectedTeam?.id || ""}
            onChange={(e) => {
              const team = teams.find((t) => t.id === e.target.value);
              setSelectedTeam(team);
              setSelectedChannel(null);
            }}
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

          <button onClick={onLogout} className="logout-button">
            Déconnexion
          </button>
        </div>
      </header>

      <div className="mattermost-content">
        {selectedTeam ? (
          <>
            <div className="channels-sidebar">
              <ChannelList
                teamId={selectedTeam.id}
                selectedChannelId={selectedChannel?.id}
                onSelectChannel={(channel) => setSelectedChannel(channel)}
                showSearch={true}
                showPrivateChannels={true}
                showDirectMessages={true}
                groupByType={true}
              />
            </div>

            <div className="messages-container">
              {selectedChannel ? (
                <>
                  <ChannelViewer
                    channelId={selectedChannel.id}
                    showHeader={true}
                    loadMessageCount={50}
                    autoScrollToBottom={true}
                  />

                  <MessageComposer
                    channelId={selectedChannel.id}
                    placeholder={`Message #${selectedChannel.display_name}`}
                    allowAttachments={true}
                    showSendButton={true}
                    onMessageSent={() => {
                      // Rafraîchir les messages (géré par le websocket)
                    }}
                  />
                </>
              ) : (
                <div className="no-channel-selected">
                  <h3>Sélectionnez un canal pour commencer</h3>
                  <p>Choisissez un canal dans la liste de gauche</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="no-team-selected">
            <h3>Sélectionnez une équipe pour commencer</h3>
            <p>Utilisez le menu déroulant en haut pour choisir une équipe</p>
          </div>
        )}
      </div>

      <footer className="app-footer">
        <div className="connection-info">
          Mode: {mode === "direct" ? "Direct" : "Proxy"} |
          {isConnected ? "Connecté" : "Déconnecté"}
        </div>
        <div className="app-version">MattermostConnect v1.0.0</div>
      </footer>
    </div>
  );
};

export default ExampleApp;

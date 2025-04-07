// src/components/ChannelList/ChannelList.js
import React, { useState, useEffect } from "react";
import { useMattermost } from "../../context/MattermostProvider.jsx";
import "./ChannelList.css";

/**
 * Composant pour afficher la liste des canaux d'une équipe
 */
const ChannelList = ({
  teamId,
  selectedChannelId,
  onSelectChannel,
  showPrivateChannels = true,
  showDirectMessages = true,
  showSearch = true,
  groupByType = true,
  className = "",
  style = {},
}) => {
  const { service, isConnected } = useMattermost();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Charger les canaux au montage et quand teamId change
  useEffect(() => {
    if (!isConnected || !teamId) return;

    const fetchChannels = async () => {
      setLoading(true);
      try {
        const channelsData = await service.getChannels(teamId);
        setChannels(channelsData);
        setLoading(false);
      } catch (err) {
        console.error("Erreur lors du chargement des canaux:", err);
        setError(`Erreur: ${err.message}`);
        setLoading(false);
      }
    };

    fetchChannels();
  }, [isConnected, teamId, service]);

  // Filtrer les canaux selon les paramètres et la recherche
  const filteredChannels = channels.filter((channel) => {
    // Filtrer selon le type de canal
    if (channel.type === "P" && !showPrivateChannels) return false;
    if (channel.type === "D" && !showDirectMessages) return false;

    // Filtrer selon la recherche
    if (searchQuery && searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      return (
        channel.display_name.toLowerCase().includes(query) ||
        (channel.header && channel.header.toLowerCase().includes(query)) ||
        (channel.purpose && channel.purpose.toLowerCase().includes(query))
      );
    }

    return true;
  });

  // Grouper les canaux par type si demandé
  const groupedChannels = groupByType
    ? {
        public: filteredChannels.filter((c) => c.type === "O"),
        private: filteredChannels.filter((c) => c.type === "P"),
        direct: filteredChannels.filter(
          (c) => c.type === "D" || c.type === "G",
        ),
      }
    : { all: filteredChannels };

  // Gérer le clic sur un canal
  const handleChannelClick = (channel) => {
    if (onSelectChannel) {
      onSelectChannel(channel);
    }
  };

  // Rendu des sections de canaux
  const renderChannelSection = (title, channelsList) => {
    if (!channelsList || channelsList.length === 0) return null;

    return (
      <div className="mattermost-channel-section">
        {title && <h3 className="mattermost-channel-section-title">{title}</h3>}
        <ul className="mattermost-channel-list">
          {channelsList.map((channel) => (
            <li
              key={channel.id}
              className={`mattermost-channel-item ${channel.id === selectedChannelId ? "mattermost-channel-selected" : ""}`}
              onClick={() => handleChannelClick(channel)}
            >
              <span className="mattermost-channel-icon">
                {channel.type === "O" && "#"}
                {channel.type === "P" && "🔒"}
                {(channel.type === "D" || channel.type === "G") && "👤"}
              </span>
              <span className="mattermost-channel-name">
                {channel.display_name}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // Rendu principal du composant
  return (
    <div className={`mattermost-channels ${className}`} style={style}>
      {/* Barre de recherche */}
      {showSearch && (
        <div className="mattermost-channel-search">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un canal..."
            className="mattermost-search-input"
          />
          {searchQuery && (
            <button
              className="mattermost-search-clear"
              onClick={() => setSearchQuery("")}
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* Affichage du chargement ou de l'erreur */}
      {loading && (
        <div className="mattermost-channel-loading">
          Chargement des canaux...
        </div>
      )}

      {error && <div className="mattermost-channel-error">{error}</div>}

      {/* Liste des canaux */}
      {!loading && !error && (
        <div className="mattermost-channel-sections">
          {groupByType ? (
            <>
              {renderChannelSection("Canaux publics", groupedChannels.public)}
              {renderChannelSection("Canaux privés", groupedChannels.private)}
              {renderChannelSection("Messages directs", groupedChannels.direct)}
            </>
          ) : (
            renderChannelSection(null, groupedChannels.all)
          )}

          {filteredChannels.length === 0 && (
            <div className="mattermost-channels-empty">
              {searchQuery ? "Aucun canal trouvé" : "Aucun canal disponible"}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChannelList;

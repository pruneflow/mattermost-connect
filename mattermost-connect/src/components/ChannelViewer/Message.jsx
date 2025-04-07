// src/components/ChannelViewer/Message.js
import React, { useState, useEffect } from "react";
import { useMattermost } from "../../context/MattermostProvider.jsx";
import { formatMessageText } from "../../utils/formatting";
import "./Message.css";

/**
 * Composant pour afficher un message individuel
 */
const Message = ({ message, renderer }) => {
  const { service } = useMattermost();
  const [author, setAuthor] = useState(null);
  const [formattedText, setFormattedText] = useState("");

  // Charger les informations de l'auteur
  useEffect(() => {
    if (!message || !message.user_id) return;

    const fetchAuthor = async () => {
      try {
        // Utiliser getUsers avec l'ID spécifique ou récupérer depuis le cache local si déjà disponible
        const users = await service.getUsers({ ids: [message.user_id] });
        if (users && users.length > 0) {
          setAuthor(users[0]);
        }
      } catch (err) {
        console.error(
          "Erreur lors du chargement des informations de l'auteur:",
          err,
        );
      }
    };

    fetchAuthor();
  }, [message, service]);

  // Formatter le texte du message (Markdown, mentions, emojis, etc.)
  useEffect(() => {
    if (!message || !message.message) return;

    // Si un service de formatage personnalisé est fourni, l'utiliser
    // Sinon, utiliser notre fonction de formatage par défaut
    setFormattedText(formatMessageText(message.message));
  }, [message]);

  // Si un renderer personnalisé est fourni, l'utiliser
  if (renderer) {
    return renderer({ message, author, formattedText });
  }

  // Format de date lisible
  const formatDate = (timestamp) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  // Rendu standard d'un message
  return (
    <div className="mattermost-message">
      <div className="mattermost-message-avatar">
        {author && author.username ? (
          <div className="mattermost-avatar-initials">
            {author.username.charAt(0).toUpperCase()}
          </div>
        ) : (
          <div className="mattermost-avatar-placeholder" />
        )}
      </div>

      <div className="mattermost-message-content">
        <div className="mattermost-message-header">
          <span className="mattermost-message-author">
            {author
              ? `${author.first_name || ""} ${author.last_name || ""} (${author.username})`.trim()
              : "Utilisateur inconnu"}
          </span>
          <span className="mattermost-message-time">
            {formatDate(message.create_at)}
          </span>
        </div>

        <div
          className="mattermost-message-text"
          dangerouslySetInnerHTML={{ __html: formattedText }}
        />

        {message.metadata &&
          message.metadata.files &&
          message.metadata.files.length > 0 && (
            <div className="mattermost-message-attachments">
              {message.metadata.files.map((file) => (
                <div key={file.id} className="mattermost-attachment">
                  <span className="mattermost-attachment-icon">📎</span>
                  <a
                    href={file.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mattermost-attachment-link"
                  >
                    {file.name}
                  </a>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
};

export default Message;

// src/components/ChannelViewer/ChannelViewer.js
import React, { useState, useEffect, useRef } from "react";
import { useMattermost } from "../../context/MattermostProvider.jsx";
import Message from "./Message.jsx";
import "./ChannelViewer.css";

/**
 * Composant pour afficher les messages d'un canal Mattermost
 */
const ChannelViewer = ({
  channelId,
  readOnly = false,
  showHeader = true,
  loadMessageCount = 50,
  autoScrollToBottom = true,
  messageRenderer,
  className = "",
  style = {},
}) => {
  const { service, isConnected } = useMattermost();
  const [channel, setChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastPostId, setLastPostId] = useState(null);
  const messagesEndRef = useRef(null);

  // Charger les informations du canal
  useEffect(() => {
    if (!isConnected || !channelId) return;

    const fetchChannel = async () => {
      try {
        const channelData = await service.getChannel(channelId);
        setChannel(channelData);
      } catch (err) {
        console.error("Erreur lors du chargement du canal:", err);
        setError(`Erreur lors du chargement du canal: ${err.message}`);
      }
    };

    fetchChannel();
  }, [isConnected, channelId, service]);

  // Charger les messages du canal
  useEffect(() => {
    if (!isConnected || !channelId) return;

    const fetchMessages = async () => {
      setLoading(true);
      try {
        const response = await service.getChannelMessages(channelId, {
          perPage: loadMessageCount,
        });

        // Convertir l'objet de posts en tableau ordonné
        const postsArray = Object.values(response.posts || {});
        const sortedPosts = postsArray.sort(
          (a, b) => a.create_at - b.create_at,
        );

        setMessages(sortedPosts);

        // Stocker l'ID du dernier message
        if (sortedPosts.length > 0) {
          setLastPostId(sortedPosts[sortedPosts.length - 1].id);
        }

        setLoading(false);
      } catch (err) {
        console.error("Erreur lors du chargement des messages:", err);
        setError(`Erreur lors du chargement des messages: ${err.message}`);
        setLoading(false);
      }
    };

    fetchMessages();
  }, [isConnected, channelId, service, loadMessageCount]);

  // Défiler vers le bas lors du chargement initial ou de nouveaux messages
  useEffect(() => {
    if (autoScrollToBottom && messagesEndRef.current && messages.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScrollToBottom]);

  // Fonction pour charger plus de messages (scrolling vers le haut)
  const loadMoreMessages = async () => {
    if (loading || !isConnected || !channelId) return;

    setLoading(true);
    try {
      // Récupérer plus de messages avant le premier message affiché
      const firstMessage = messages[0];
      if (!firstMessage) return;

      const response = await service.getChannelMessages(channelId, {
        perPage: loadMessageCount,
        before: firstMessage.id,
      });

      // Convertir et trier les nouveaux messages
      const newPostsArray = Object.values(response.posts || {});
      const sortedNewPosts = newPostsArray.sort(
        (a, b) => a.create_at - b.create_at,
      );

      // Combiner avec les messages existants
      setMessages([...sortedNewPosts, ...messages]);
      setLoading(false);
    } catch (err) {
      console.error(
        "Erreur lors du chargement des messages supplémentaires:",
        err,
      );
      setError(
        `Erreur lors du chargement des messages supplémentaires: ${err.message}`,
      );
      setLoading(false);
    }
  };

  // Rendu de la liste des messages
  const renderMessages = () => {
    if (loading && messages.length === 0) {
      return (
        <div className="mattermost-channel-loading">
          Chargement des messages...
        </div>
      );
    }

    if (error) {
      return <div className="mattermost-channel-error">{error}</div>;
    }

    if (messages.length === 0) {
      return (
        <div className="mattermost-channel-empty">
          Aucun message dans ce canal
        </div>
      );
    }

    return (
      <>
        {messages.length >= loadMessageCount && (
          <div className="mattermost-load-more">
            <button onClick={loadMoreMessages} disabled={loading}>
              {loading ? "Chargement..." : "Charger plus de messages"}
            </button>
          </div>
        )}

        <div className="mattermost-messages-list">
          {messages.map((message) => (
            <Message
              key={message.id}
              message={message}
              renderer={messageRenderer}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </>
    );
  };

  // Rendu du header du canal
  const renderChannelHeader = () => {
    if (!showHeader || !channel) return null;

    return (
      <div className="mattermost-channel-header">
        <h3 className="mattermost-channel-name">
          {channel.type === "D" ? "Message direct" : channel.display_name}
        </h3>
        {channel.header && (
          <div className="mattermost-channel-description">{channel.header}</div>
        )}
      </div>
    );
  };

  return (
    <div className={`mattermost-channel-viewer ${className}`} style={style}>
      {renderChannelHeader()}
      {renderMessages()}
    </div>
  );
};

export default ChannelViewer;

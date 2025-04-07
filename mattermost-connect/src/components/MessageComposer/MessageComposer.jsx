// src/components/MessageComposer/MessageComposer.js
import React, { useState, useRef, useEffect } from "react";
import { useMattermost } from "../../context/MattermostProvider.jsx";
import "./MessageComposer.css";

/**
 * Composant pour rédiger et envoyer des messages dans un canal
 */
const MessageComposer = ({
  channelId,
  placeholder = "Écrivez un message...",
  allowAttachments = true,
  showSendButton = true,
  maxHeight = "150px",
  onMessageSent = () => {},
  disableEnterKey = false,
  className = "",
  style = {},
}) => {
  const { service, isConnected } = useMattermost();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Ajuster automatiquement la hauteur du textarea
  useEffect(() => {
    if (textareaRef.current) {
      // Réinitialiser d'abord la hauteur pour un calcul correct
      textareaRef.current.style.height = "auto";

      // Définir la nouvelle hauteur basée sur le contenu
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height =
        scrollHeight > parseInt(maxHeight) ? maxHeight : `${scrollHeight}px`;
    }
  }, [message, maxHeight]);

  // Fonction pour envoyer le message
  const sendMessage = async () => {
    if (!isConnected || !channelId || !message.trim()) return;

    setSending(true);
    setError(null);

    try {
      // Envoyer le message texte
      const response = await service.postMessage(channelId, message);

      // Gérer les fichiers joints si présents
      if (files.length > 0) {
        await handleFileAttachments(response.id);
      }

      // Réinitialiser le formulaire
      setMessage("");
      setFiles([]);
      setSending(false);

      // Callback pour notification
      onMessageSent(response);
    } catch (err) {
      console.error("Erreur lors de l'envoi du message:", err);
      setError(`Erreur lors de l'envoi: ${err.message}`);
      setSending(false);
    }
  };

  // Gestion des pièces jointes
  const handleFileAttachments = async (postId) => {
    if (!postId || files.length === 0) return;

    try {
      // Créer un FormData pour l'envoi de fichiers
      const formData = new FormData();
      formData.append("channel_id", channelId);
      formData.append("post_id", postId);

      // Ajouter chaque fichier
      files.forEach((file) => {
        formData.append("files", file);
      });

      // Utiliser une méthode spécifique du service pour les fichiers
      await service.uploadFiles(formData);
    } catch (err) {
      console.error("Erreur lors de l'envoi des fichiers:", err);
      setError(`Les fichiers n'ont pas pu être envoyés: ${err.message}`);
    }
  };

  // Gérer les touches du clavier (Entrée pour envoyer, Shift+Entrée pour nouveau paragraphe)
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !disableEnterKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Gestion du changement de fichiers
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      // Convertir FileList en Array
      const newFiles = Array.from(e.target.files);
      setFiles([...files, ...newFiles]);
    }
  };

  // Supprimer un fichier de la liste
  const removeFile = (index) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  return (
    <div className={`mattermost-message-composer ${className}`} style={style}>
      {/* Zone de pièces jointes */}
      {allowAttachments && files.length > 0 && (
        <div className="mattermost-attachments-preview">
          {files.map((file, index) => (
            <div key={index} className="mattermost-attachment-item">
              <span className="mattermost-attachment-name">{file.name}</span>
              <button
                type="button"
                className="mattermost-attachment-remove"
                onClick={() => removeFile(index)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Affichage des erreurs */}
      {error && <div className="mattermost-composer-error">{error}</div>}

      <div className="mattermost-composer-container">
        {/* Zone de texte */}
        <textarea
          ref={textareaRef}
          className="mattermost-composer-textarea"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={sending || !isConnected}
          rows={1}
          style={{ maxHeight }}
        />

        {/* Boutons d'action */}
        <div className="mattermost-composer-actions">
          {/* Bouton d'attachement */}
          {allowAttachments && (
            <>
              <button
                type="button"
                className="mattermost-composer-attach"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending || !isConnected}
              >
                📎
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </>
          )}

          {/* Bouton d'envoi */}
          {showSendButton && (
            <button
              type="button"
              className="mattermost-composer-send"
              onClick={sendMessage}
              disabled={sending || !message.trim() || !isConnected}
            >
              {sending ? "Envoi..." : "Envoyer"}
            </button>
          )}
        </div>
      </div>

      {/* Indication que Entrée envoie le message */}
      {!disableEnterKey && (
        <div className="mattermost-composer-hint">
          Appuyez sur <kbd>Entrée</kbd> pour envoyer, <kbd>Shift+Entrée</kbd>{" "}
          pour un saut de ligne
        </div>
      )}
    </div>
  );
};

export default MessageComposer;

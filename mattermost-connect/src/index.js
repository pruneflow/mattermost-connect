// src/index.js
// Point d'entrée principal de la bibliothèque

// Context et Provider
import {
  MattermostProvider,
  MattermostContext,
  useMattermost,
} from "./context/MattermostProvider.jsx";

// Composants
import ChannelViewer from "./components/ChannelViewer/ChannelViewer.jsx";
import MessageComposer from "./components/MessageComposer/MessageComposer.jsx";
import ChannelList from "./components/ChannelList/ChannelList.jsx";

// Utilitaires
import { MattermostAPI } from "./utils/api";
import {
  formatMessageText,
  formatTimestamp,
  truncateText,
} from "./utils/formatting";

// Exporter les composants publics
export {
  // Provider et Context
  MattermostProvider,
  MattermostContext,
  useMattermost,

  // Composants principaux
  ChannelViewer,
  MessageComposer,
  ChannelList,

  // Utilitaires
  MattermostAPI,
  formatMessageText,
  formatTimestamp,
  truncateText,
};

// Exportation par défaut du Provider pour faciliter l'import
export default MattermostProvider;

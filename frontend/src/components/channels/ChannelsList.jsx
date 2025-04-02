// src/components/channels/ChannelsList.jsx
import { useState } from "react";
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  Box,
  Chip,
} from "@mui/material";
import {
  Search as SearchIcon,
  Forum as PublicChannelIcon,
  Lock as PrivateChannelIcon,
  Announcement as AnnouncementIcon,
  Person as DirectMessageIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

const ChannelsList = ({ channels, selectedChannelId, onChannelSelect }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");

  // Filtrer les canaux selon le terme de recherche
  const filteredChannels =
    channels?.filter(
      (channel) =>
        channel.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        channel.name.toLowerCase().includes(searchTerm.toLowerCase()),
    ) || [];

  // Déterminer l'icône appropriée en fonction du type de canal
  const getChannelIcon = (channel) => {
    switch (channel.type) {
      case "O": // Canal ouvert
        return <PublicChannelIcon />;
      case "P": // Canal privé
        return <PrivateChannelIcon />;
      case "D": // Message direct
        return <DirectMessageIcon />;
      case "G": // Groupe
        return <PrivateChannelIcon />;
      default:
        return <PublicChannelIcon />;
    }
  };

  // Afficher un message si aucun canal n'est trouvé
  if (!channels || channels.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="body1" color="textSecondary" component={"div"}>
          {t("channels.noChannels")}
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ height: "100%" }}>
      {/* Barre de recherche */}
      <Box sx={{ p: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder={t("channels.search")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Liste des canaux */}
      <List sx={{ overflow: "auto", maxHeight: "500px" }}>
        {filteredChannels.map((channel) => (
          <ListItem
            key={channel.id}
            disablePadding
            secondaryAction={
              <Chip
                size="small"
                label={t(`channels.types.${channel.type}`)}
                color={
                  channel.type === "O"
                    ? "primary"
                    : channel.type === "P"
                      ? "secondary"
                      : "default"
                }
                variant="outlined"
              />
            }
          >
            <ListItemButton
              selected={selectedChannelId === channel.id}
              onClick={() => onChannelSelect(channel.id)}
            >
              <ListItemIcon>{getChannelIcon(channel)}</ListItemIcon>
              <ListItemText
                primary={channel.display_name}
                secondary={channel.purpose || channel.header}
                primaryTypographyProps={{
                  fontWeight:
                    selectedChannelId === channel.id ? "bold" : "normal",
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default ChannelsList;

// src/components/channels/EnhancedChannelsList.jsx
import { useState } from "react";
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Button,
} from "@mui/material";
import {
  Search as SearchIcon,
  Forum as PublicChannelIcon,
  Lock as PrivateChannelIcon,
  Edit as EditIcon,
  Archive as ArchiveIcon,
  Add as AddIcon,
  Person as DirectMessageIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

/**
 * Version améliorée de la liste des canaux avec des actions
 */
export const ChannelsList = ({
  channels,
  selectedChannelId,
  onChannelSelect,
  onAddClick,
  onEditClick,
  onArchiveClick,
}) => {
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
      {/* En-tête avec barre de recherche et bouton d'ajout */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
        }}
      >
        <TextField
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
          sx={{ flexGrow: 1, mr: 2 }}
        />
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={onAddClick}
        >
          {t("channels.create.button")}
        </Button>
      </Box>

      {/* Liste des canaux */}
      <List sx={{ overflow: "auto", maxHeight: "500px" }}>
        {filteredChannels.map((channel) => (
          <ListItem
            key={channel.id}
            disablePadding
            secondaryAction={
              <Box>
                <Tooltip title={t("channels.edit.tooltip")}>
                  <IconButton
                    edge="end"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditClick(channel);
                    }}
                    size="small"
                    sx={{ mr: 1 }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip
                  title={
                    channel.isDefaultChannel
                      ? t("channels.archive.defaultTooltip")
                      : t("channels.archive.tooltip")
                  }
                >
                  <span>
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchiveClick(channel);
                      }}
                      disabled={channel.isDefaultChannel}
                      size="small"
                      color="error"
                    >
                      <ArchiveIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            }
            sx={{
              bgcolor: channel.isDefaultChannel
                ? "rgba(0, 0, 0, 0.04)"
                : "inherit",
            }}
          >
            <ListItemButton
              selected={selectedChannelId === channel.id}
              onClick={() => onChannelSelect(channel.id)}
              sx={{ pr: 10 }} // Ajouter de l'espace pour les actions
            >
              <ListItemIcon>{getChannelIcon(channel)}</ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Typography
                      component="span"
                      fontWeight={
                        selectedChannelId === channel.id ? "bold" : "normal"
                      }
                    >
                      {channel.display_name}
                    </Typography>

                    {channel.isDefaultChannel && (
                      <Chip
                        size="small"
                        label={t("channels.defaultChannel")}
                        variant="outlined"
                        sx={{ ml: 1, height: 20, fontSize: "0.7rem" }}
                      />
                    )}

                    <Chip
                      size="small"
                      label={t(`channels.types.${channel.type}`)}
                      color={channel.type === "O" ? "primary" : "secondary"}
                      variant="outlined"
                      sx={{ ml: 1, height: 20, fontSize: "0.7rem" }}
                    />
                  </Box>
                }
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

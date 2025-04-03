// src/components/channels/ChannelsList.jsx
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
  Badge,
} from "@mui/material";
import {
  Search as SearchIcon,
  Forum as PublicChannelIcon,
  Lock as PrivateChannelIcon,
  Edit as EditIcon,
  Archive as ArchiveIcon,
  Restore as RestoreIcon,
  Add as AddIcon,
  Person as DirectMessageIcon,
  FilterList as FilterIcon,
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
  onRestoreClick,
  showArchived = false,
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

  // Séparers les canaux actifs et archivés pour affichage
  const archivedChannels = filteredChannels.filter(
    (channel) => channel.isArchived,
  );
  const activeChannels = filteredChannels.filter(
    (channel) => !channel.isArchived,
  );

  // Déterminer le nombre de canaux archivés pour badge
  const archivedCount = archivedChannels.length;

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
        {/* Afficher en priorité les canaux actifs */}
        {activeChannels.map((channel) => (
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

        {/* Section pour les canaux archivés, visible seulement si showArchived est activé */}
        {showArchived && archivedChannels.length > 0 && (
          <>
            <Box sx={{ py: 1, px: 2, bgcolor: "rgba(0, 0, 0, 0.08)" }}>
              <Typography variant="subtitle2" color="textSecondary">
                {t("channels.archivedSection", {
                  count: archivedChannels.length,
                })}
              </Typography>
            </Box>

            {archivedChannels.map((channel) => (
              <ListItem
                key={channel.id}
                disablePadding
                secondaryAction={
                  <Box>
                    <Tooltip title={t("channels.restore.tooltip")}>
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRestoreClick(channel);
                        }}
                        size="small"
                        color="primary"
                      >
                        <RestoreIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
                sx={{
                  bgcolor: "rgba(0, 0, 0, 0.03)",
                  borderLeft: "4px solid",
                  borderColor: "grey.400",
                }}
              >
                <ListItemButton
                  selected={selectedChannelId === channel.id}
                  onClick={() => onChannelSelect(channel.id)}
                  sx={{ pr: 10 }}
                >
                  <ListItemIcon sx={{ opacity: 0.7 }}>
                    {getChannelIcon(channel)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Typography
                          component="span"
                          fontWeight={
                            selectedChannelId === channel.id ? "bold" : "normal"
                          }
                          sx={{ opacity: 0.7 }}
                        >
                          {channel.display_name}
                        </Typography>

                        <Chip
                          size="small"
                          label={t("channels.archived")}
                          color="default"
                          sx={{ ml: 1, height: 20, fontSize: "0.7rem" }}
                        />

                        <Chip
                          size="small"
                          label={t(`channels.types.${channel.type}`)}
                          color={channel.type === "O" ? "primary" : "secondary"}
                          variant="outlined"
                          sx={{
                            ml: 1,
                            height: 20,
                            fontSize: "0.7rem",
                            opacity: 0.7,
                          }}
                        />
                      </Box>
                    }
                    secondary={channel.purpose || channel.header}
                    primaryTypographyProps={{
                      fontWeight:
                        selectedChannelId === channel.id ? "bold" : "normal",
                    }}
                    secondaryTypographyProps={{
                      sx: { opacity: 0.7 },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </>
        )}

        {/* Message quand il n'y a pas de résultats */}
        {filteredChannels.length === 0 && (
          <ListItem>
            <ListItemText
              primary={
                <Typography align="center" color="textSecondary">
                  {t("channels.noSearchResults", { search: searchTerm })}
                </Typography>
              }
            />
          </ListItem>
        )}
      </List>
    </Paper>
  );
};

export default ChannelsList;

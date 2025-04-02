// src/components/channels/ChannelDetails.jsx
import {
  Paper,
  Typography,
  Box,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
} from "@mui/material";
import {
  Forum as PublicChannelIcon,
  Lock as PrivateChannelIcon,
  Person as UserIcon,
  Today as DateIcon,
  Description as DescriptionIcon,
  Check as DefaultIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

const ChannelDetails = ({ channel, onClose }) => {
  const { t } = useTranslation();

  if (!channel) return null;

  // Formater la date de création
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Déterminer l'icône du canal en fonction de son type
  const ChannelTypeIcon =
    channel.type === "O" ? PublicChannelIcon : PrivateChannelIcon;

  return (
    <Paper sx={{ p: 3, height: "100%", position: "relative" }}>
      {/* Bouton de fermeture en haut à droite */}
      <IconButton
        onClick={onClose}
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 1,
        }}
        aria-label={t("channels.details.close")}
        size="small"
      >
        <CloseIcon fontSize="small" />
      </IconButton>

      {/* En-tête avec nom et type */}
      <Box display="flex" alignItems="center" mb={2} pr={6}>
        <ChannelTypeIcon
          sx={{
            mr: 1,
            color: channel.type === "O" ? "primary.main" : "secondary.main",
          }}
        />
        <Typography variant="h6" component="h3">
          {channel.display_name}
        </Typography>
        <Chip
          size="small"
          label={t(`channels.types.${channel.type}`)}
          color={channel.type === "O" ? "primary" : "secondary"}
          sx={{ ml: 2 }}
        />

        {/* Ajouter un tag pour les canaux par défaut */}
        {channel.isDefaultChannel && (
          <Chip
            size="small"
            icon={<DefaultIcon />}
            label={t("channels.defaultChannel")}
            color="default"
            variant="outlined"
            sx={{ ml: 1 }}
          />
        )}
      </Box>

      {/* URL et identifiants */}
      <Typography variant="body2" color="textSecondary" gutterBottom>
        ~{channel.name}
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        ID: {channel.id}
      </Typography>

      <Divider sx={{ my: 2 }} />

      {/* Description et détails */}
      <Box mb={3}>
        <Typography variant="subtitle2" gutterBottom>
          {t("channels.details.header")}
        </Typography>
        <Typography variant="body2" paragraph>
          {channel.header || t("channels.details.noHeader")}
        </Typography>
      </Box>

      <Box mb={3}>
        <Typography variant="subtitle2" gutterBottom>
          {t("channels.details.purpose")}
        </Typography>
        <Typography variant="body2" paragraph>
          {channel.purpose || t("channels.details.noPurpose")}
        </Typography>
      </Box>

      {/* Informations complémentaires */}
      <List dense>
        <ListItem>
          <ListItemIcon>
            <DateIcon />
          </ListItemIcon>
          <ListItemText
            primary={t("channels.details.created")}
            secondary={formatDate(channel.create_at) || "-"}
          />
        </ListItem>

        {/* Afficher le créateur seulement si ce n'est pas un canal par défaut */}
        {!channel.isDefaultChannel && channel.creator && (
          <ListItem>
            <ListItemIcon>
              <UserIcon />
            </ListItemIcon>
            <ListItemText
              primary={t("channels.details.creator")}
              secondary={channel.creator.displayName}
            />
          </ListItem>
        )}
      </List>
    </Paper>
  );
};

export default ChannelDetails;

import {
  Card,
  Box,
  Typography,
  IconButton,
  Chip,
  Button,
  Collapse,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  VpnKey as KeyIcon,
  Link as LinkIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

/**
 * Composant pour afficher un espace Mattermost individuel
 */
const SpaceCard = ({
  space,
  isSelected,
  onSelect,
  onEdit,
  onToken,
  onDelete,
  onCopyToClipboard,
}) => {
  const { t } = useTranslation();

  // Gestionnaire de clic sur la carte
  const handleClick = () => {
    onSelect(space.id);
  };

  // Éviter la propagation du clic pour les actions
  const handleActionClick = (e, action) => {
    e.stopPropagation();
    action(space);
  };

  // Éviter la propagation du clic pour la copie
  const handleCopy = (e, text, label) => {
    e.stopPropagation();
    onCopyToClipboard(text, label);
  };

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 2,
        cursor: "pointer",
        border: isSelected
          ? "1px solid #1976d2"
          : "1px solid rgba(0, 0, 0, 0.12)",
        backgroundColor: isSelected
          ? "rgba(25, 118, 210, 0.08)"
          : "transparent",
      }}
      onClick={handleClick}
    >
      {/* En-tête de la carte avec le nom de l'espace et les actions */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          p: 2,
        }}
      >
        <Box>
          <Typography variant="subtitle1" component="div" fontWeight="medium">
            {space.name}
          </Typography>

          <Box sx={{ display: "flex", mt: 1, flexWrap: "wrap", gap: 1 }}>
            {/* Affichage des badges de statut */}
            {space.isActive ? (
              <Chip size="small" color="success" label={t("spaces.active")} />
            ) : (
              <Chip size="small" color="error" label={t("spaces.inactive")} />
            )}

            {/* Badge API Token */}
            {space.apiToken && (
              <Chip size="small" color="info" label={t("spaces.apiToken")} />
            )}
          </Box>
        </Box>

        {/* Boutons d'action */}
        <Box sx={{ display: "flex" }}>
          <IconButton
            onClick={(e) => handleActionClick(e, onEdit)}
            data-testid="edit-button"
            size="small"
          >
            <EditIcon />
          </IconButton>
          <IconButton
            onClick={(e) => handleActionClick(e, onToken)}
            data-testid="token-button"
            size="small"
            sx={{ ml: 1 }}
          >
            <KeyIcon />
          </IconButton>
          <IconButton
            onClick={(e) => handleActionClick(e, onDelete)}
            data-testid="delete-button"
            color="error"
            size="small"
            sx={{ ml: 1 }}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Contenu détaillé qui s'affiche si la carte est sélectionnée */}
      <Collapse in={isSelected} timeout="auto" unmountOnExit>
        <Box sx={{ p: 2, pt: 0 }}>
          <Typography variant="body2" component="div" color="textSecondary">
            ID: {space.id}
          </Typography>

          {/* Détails de l'équipe */}
          {space.config?.teamName && (
            <Typography variant="body2" component="div" color="textSecondary">
              {t("spaces.team")}: {space.config.teamName}
            </Typography>
          )}

          {space.config?.teamId && (
            <Typography variant="body2" component="div" color="textSecondary">
              {t("spaces.teamId")}: {space.config.teamId}
            </Typography>
          )}

          {/* Date de création */}
          {space.createdAt && (
            <Typography variant="body2" component="div" color="textSecondary">
              {t("spaces.createdAt")}:{" "}
              {new Date(space.createdAt).toLocaleDateString()}
            </Typography>
          )}

          {/* URL d'invitation */}
          {space.config?.inviteUrl && (
            <Box display="flex" alignItems="center" mt={1}>
              <Button
                size="small"
                startIcon={<LinkIcon />}
                onClick={(e) =>
                  handleCopy(e, space.config.inviteUrl, t("spaces.inviteUrl"))
                }
              >
                {t("spaces.copyInvite")}
              </Button>
            </Box>
          )}

          {/* Affichage et copie du token API */}
          {space.apiToken && (
            <Box mt={2}>
              <Typography variant="body2" component="div" color="textSecondary">
                {t("spaces.apiToken")}: {space.apiToken.substring(0, 10)}...
                <Button
                  size="small"
                  sx={{ ml: 1 }}
                  onClick={(e) =>
                    handleCopy(e, space.apiToken, t("spaces.apiToken"))
                  }
                >
                  {t("spaces.copy")}
                </Button>
              </Typography>
            </Box>
          )}
        </Box>
      </Collapse>
    </Card>
  );
};

export default SpaceCard;

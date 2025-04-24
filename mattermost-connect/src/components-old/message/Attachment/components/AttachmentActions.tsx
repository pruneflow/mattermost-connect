import { Tooltip, IconButton, Box } from "@mui/material";
import {
  MoreVert as MoreIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";

interface AttachmentActionsProps {
  /** Fonction de clic pour le menu d'options */
  handleMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
  /** Fonction de clic pour le téléchargement */
  handleDownload: (event: React.MouseEvent<HTMLElement>) => void;
  /** Si on est en mode mobile ou hover */
  showControls: boolean;
  /** Si on est en mode prévisualisation */
  isPreviewMode: boolean;
}

const AttachmentActions: React.FC<AttachmentActionsProps> = ({
  handleMenuOpen,
  handleDownload,
  showControls,
  isPreviewMode,
}) => {
  if (isPreviewMode || !showControls) return null;

  return (
    <Box sx={{ display: "flex", ml: 1 }}>
      <Tooltip title="Options">
        <IconButton id="options-button" size="small" onClick={handleMenuOpen}>
          <MoreIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Tooltip title="Download">
        <IconButton size="small" onClick={handleDownload}>
          <DownloadIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default AttachmentActions;

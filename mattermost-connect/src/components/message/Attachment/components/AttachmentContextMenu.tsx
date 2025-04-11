import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from "@mui/material";
import { Link as LinkIcon } from "@mui/icons-material";

interface AttachmentContextMenuProps {
  /** Position du menu */
  menuPosition: { top: number; left: number } | null;
  /** Fonction pour fermer le menu */
  handleMenuClose: () => void;
  /** Fonction pour créer un lien public */
  handleCreatePublicLink: () => void;
  /** Si la création de lien est en cours */
  publicLinkLoading: boolean;
}

const AttachmentContextMenu: React.FC<AttachmentContextMenuProps> = ({
  menuPosition,
  handleMenuClose,
  handleCreatePublicLink,
  publicLinkLoading,
}) => {
  return (
    <Menu
      id="options-menu"
      open={Boolean(menuPosition)}
      onClose={handleMenuClose}
      anchorReference="anchorPosition"
      anchorPosition={menuPosition ? menuPosition : undefined}
    >
      <MenuItem
        onClick={handleCreatePublicLink}
        disabled={publicLinkLoading}
        dense
      >
        <ListItemIcon>
          {publicLinkLoading ? (
            <CircularProgress size={20} />
          ) : (
            <LinkIcon fontSize="small" />
          )}
        </ListItemIcon>
        <ListItemText
          primary={publicLinkLoading ? "Creating..." : "Create public link"}
        />
      </MenuItem>
    </Menu>
  );
};

export default AttachmentContextMenu;

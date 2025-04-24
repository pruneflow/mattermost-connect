import { Badge, BadgeProps, styled, SxProps, Theme } from "@mui/material";

// Types de statut disponibles
export type StatusType = "online" | "away" | "busy" | "offline" | "typing";

// Couleurs associées à chaque statut
const statusColors: Record<StatusType, string> = {
  online: "#44b700",
  away: "#ffb74d",
  busy: "#f44336",
  offline: "#bdbdbd",
  typing: "#2196f3",
};

// Configuration des animations par statut
const statusAnimations: Partial<Record<StatusType, string>> = {
  typing: `typing 1.5s infinite`,
};

// Définition du badge avec styling personnalisé
const StyledBadge = styled(Badge)<BadgeProps & { statustype: StatusType }>(
  ({ theme, statustype }) => ({
    "& .MuiBadge-badge": {
      backgroundColor: statusColors[statustype],
      color: statusColors[statustype],
      boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
      "&::after": {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        animation: statusAnimations[statustype],
        border: "1px solid currentColor",
        content: '""',
      },
    },
    "@keyframes typing": {
      "0%": {
        transform: "scale(1)",
        opacity: 1,
      },
      "50%": {
        transform: "scale(1.2)",
        opacity: 0.7,
      },
      "100%": {
        transform: "scale(1)",
        opacity: 1,
      },
    },
  }),
);

interface StatusBadgeProps {
  /** Type de statut */
  status: StatusType;
  /** Contenu entouré par le badge */
  children: React.ReactNode;
  /** Position du badge */
  position?: {
    vertical: "top" | "bottom";
    horizontal: "left" | "right";
  };
  /** Taille du badge */
  size?: number;
  /** Styles personnalisés */
  sx?: SxProps<Theme>;
}

/**
 * Badge affichant le statut d'un utilisateur ou d'un élément
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  children,
  position = { vertical: "bottom", horizontal: "right" },
  size = 10,
  sx,
}) => {
  return (
    <StyledBadge
      overlap="circular"
      anchorOrigin={position}
      variant="dot"
      statustype={status}
      sx={{
        "& .MuiBadge-badge": {
          width: size,
          height: size,
          borderRadius: "50%",
          minWidth: size,
        },
        ...sx,
      }}
    >
      {children}
    </StyledBadge>
  );
};

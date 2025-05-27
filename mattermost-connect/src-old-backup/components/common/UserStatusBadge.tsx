import React from 'react';
import { Box, Tooltip, SxProps, Theme } from '@mui/material';
import { UserStatus } from '../../api/types';
import { getStatusColor, getStatusLabel, getStatusIcon } from '../../utils/statusConfig';

export interface UserStatusBadgeProps {
  // Status Data
  status?: UserStatus;
  
  // Display options
  size?: 'small' | 'medium' | 'large' | number;
  variant?: 'dot' | 'icon' | 'both';
  showTooltip?: boolean;
  
  // Style options
  bordered?: boolean;
  inline?: boolean;
  iconOnly?: boolean;
  
  // Optional styling
  sx?: SxProps<Theme>;
  className?: string;
}

/**
 * Composant UI pur pour afficher un indicateur de statut utilisateur
 * Peut afficher un point coloré, une icône, ou les deux
 */
export const UserStatusBadge: React.FC<UserStatusBadgeProps> = ({
  status,
  size = 'medium',
  variant = 'dot',
  showTooltip = true,
  bordered = true,
  inline = true,
  iconOnly = false,
  sx,
  className
}) => {
  // Pas de rendu si pas de statut
  if (!status) return null;
  
  // Convertir la taille en pixels
  const sizeMap = {
    small: 8,
    medium: 10,
    large: 12
  };
  const pixelSize = typeof size === 'number' ? size : sizeMap[size];
  
  // Obtenir la couleur, le libellé et l'icône du statut
  const statusColor = getStatusColor(status);
  const statusLabel = getStatusLabel(status);
  const statusIcon = getStatusIcon(status);
  
  // Rendu pour le variant 'dot' (point coloré)
  const dotElement = (
    <Box
      sx={{
        width: pixelSize,
        height: pixelSize,
        borderRadius: '50%',
        bgcolor: statusColor,
        ...(bordered && {
          border: '1.5px solid',
          borderColor: 'background.paper'
        }),
        boxShadow: bordered ? '0 0 2px rgba(0,0,0,0.2)' : 'none',
        transition: 'all 0.2s ease-in-out',
        display: inline ? 'inline-block' : 'block',
        flexShrink: 0,
        ...sx
      }}
      className={className}
    />
  );
  
  // Rendu pour le variant 'icon' (icône uniquement)
  const iconSizePx = pixelSize * 2;
  const iconElement = React.cloneElement(statusIcon as React.ReactElement, {
    style: { 
      fontSize: iconSizePx,
      color: statusColor
    }
  });
  
  // Contenu final en fonction du variant
  let content;
  if (variant === 'dot') {
    content = dotElement;
  } else if (variant === 'icon') {
    content = iconElement;
  } else if (variant === 'both') {
    content = (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {iconElement}
        <Box sx={{ ml: 0.5 }}>{dotElement}</Box>
      </Box>
    );
  }
  
  // Ajouter le tooltip si nécessaire
  if (showTooltip && content) {
    return (
      <Tooltip title={statusLabel} arrow placement="top">
        {content}
      </Tooltip>
    );
  }
  
  return content || null;
};

export default UserStatusBadge;
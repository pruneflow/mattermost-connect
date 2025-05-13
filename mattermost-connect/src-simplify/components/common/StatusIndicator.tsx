import React from 'react';
import { Box, Tooltip } from '@mui/material';
import { useUserStatus } from '../../hooks';

// Status options with colors - matches UserProfile.tsx
const statusColors = {
  online: '#4caf50',
  away: '#ff9800',
  dnd: '#f44336',
  offline: '#9e9e9e'
};

// Status labels for tooltips
const statusLabels = {
  online: 'Online',
  away: 'Away',
  dnd: 'Do Not Disturb',
  offline: 'Offline'
};

export interface StatusIndicatorProps {
  userId: string;
  size?: number;
}

/**
 * Indicateur de statut utilisateur simple
 * Récupère le statut via le hook useUserStatus optimisé pour les mises à jour en temps réel
 */
export function StatusIndicator({ userId, size = 10 }: StatusIndicatorProps) {
  // Utiliser le hook spécialisé useUserStatus qui ne s'abonne qu'aux changements pour cet utilisateur
  const status = useUserStatus(userId);
  
  // Le statut est déjà 'offline' par défaut si absent
  const currentStatus = status;
  
  // Obtenir la couleur correspondant au statut
  const statusColor = statusColors[currentStatus as keyof typeof statusColors] || statusColors.offline;
  
  // Obtenir le libellé du statut pour le tooltip
  const statusLabel = statusLabels[currentStatus as keyof typeof statusLabels] || statusLabels.offline;
  
  return (
    <Tooltip title={statusLabel} arrow placement="top">
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: '50%',
          bgcolor: statusColor,
          border: '2px solid',
          borderColor: 'background.paper',
          boxShadow: '0 0 3px rgba(0,0,0,0.2)',
          transition: 'all 0.2s ease-in-out',
          display: 'inline-block',
          flexShrink: 0
        }}
      />
    </Tooltip>
  );
}

export default StatusIndicator;
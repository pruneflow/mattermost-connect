import React from 'react';
import { UserStatus } from '../../api/types';
import { useUserStatus } from '../../hooks';
import { UserStatusBadge } from './UserStatusBadge';

export interface StatusIndicatorProps {
  userId: string;
  size?: 'small' | 'medium' | 'large' | number;
  variant?: 'dot' | 'icon' | 'both';
  showTooltip?: boolean;
}

/**
 * Indicateur de statut utilisateur
 * Récupère le statut via le hook useUserStatus puis l'affiche avec UserStatusBadge
 */
export function StatusIndicator({ 
  userId, 
  size = 'medium', 
  variant = 'dot',
  showTooltip = true
}: StatusIndicatorProps) {
  // Utiliser le hook spécialisé useUserStatus qui ne s'abonne qu'aux changements pour cet utilisateur
  const status = useUserStatus(userId) as UserStatus;
  
  // Si pas de statut ou pas d'utilisateur, ne rien afficher
  if (!status || !userId) return null;
  
  // Utiliser le composant UserStatusBadge pour afficher le statut
  return (
    <UserStatusBadge
      status={status}
      size={size}
      variant={variant}
      showTooltip={showTooltip}
      bordered={true}
    />
  );
}

export default StatusIndicator;
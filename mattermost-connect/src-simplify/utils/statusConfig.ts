import React from 'react';
import {
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  DoNotDisturb as DoNotDisturbIcon,
  OfflinePin as OfflinePinIcon
} from '@mui/icons-material';
import { UserStatus } from '../api/types';

/**
 * Configuration centralisée pour les statuts utilisateur
 * Utilisé par UserStatusBadge, StatusIndicator et autres composants
 */
export const STATUS_OPTIONS = [
  { value: 'online', label: 'Online', color: '#4caf50', icon: React.createElement(CheckCircleIcon) },
  { value: 'away', label: 'Away', color: '#ff9800', icon: React.createElement(AccessTimeIcon) },
  { value: 'dnd', label: 'Do Not Disturb', color: '#f44336', icon: React.createElement(DoNotDisturbIcon) },
  { value: 'offline', label: 'Offline', color: '#9e9e9e', icon: React.createElement(OfflinePinIcon) }
];

/**
 * Récupère la couleur pour un statut donné
 */
export function getStatusColor(status?: UserStatus): string {
  if (!status) return STATUS_OPTIONS[3].color; // Offline par défaut
  const statusOption = STATUS_OPTIONS.find(opt => opt.value === status);
  return statusOption?.color || STATUS_OPTIONS[3].color;
}

/**
 * Récupère le libellé pour un statut donné
 */
export function getStatusLabel(status?: UserStatus): string {
  if (!status) return STATUS_OPTIONS[3].label; // Offline par défaut
  const statusOption = STATUS_OPTIONS.find(opt => opt.value === status);
  return statusOption?.label || STATUS_OPTIONS[3].label;
}

/**
 * Récupère l'icône pour un statut donné
 */
export function getStatusIcon(status?: UserStatus): React.ReactNode {
  if (!status) return STATUS_OPTIONS[3].icon; // Offline par défaut
  const statusOption = STATUS_OPTIONS.find(opt => opt.value === status);
  return statusOption?.icon || STATUS_OPTIONS[3].icon;
}

/**
 * Récupère toutes les informations pour un statut donné
 */
export function getStatusInfo(status?: UserStatus) {
  if (!status) return STATUS_OPTIONS[3]; // Offline par défaut
  return STATUS_OPTIONS.find(opt => opt.value === status) || STATUS_OPTIONS[3];
}

export default STATUS_OPTIONS;
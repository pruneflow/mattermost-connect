import type { UserStatus } from '../api/types';

/**
 * Official Mattermost status colors
 */
export const STATUS_COLORS = {
  online: '#28a745',
  away: '#ffc107', 
  dnd: '#dc3545',
  offline: '#6c757d',
} as const;

/**
 * Get status color for a given status
 */
export const getStatusColor = (status: UserStatus['status'] | null | undefined): string => {
  if (!status) return STATUS_COLORS.offline;
  return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.offline;
};

/**
 * Status options for UI components
 */
export const STATUS_OPTIONS = [
  { value: 'online' as const, label: 'Online', color: STATUS_COLORS.online },
  { value: 'away' as const, label: 'Away', color: STATUS_COLORS.away },
  { value: 'dnd' as const, label: 'Do Not Disturb', color: STATUS_COLORS.dnd },
  { value: 'offline' as const, label: 'Offline', color: STATUS_COLORS.offline },
] as const;
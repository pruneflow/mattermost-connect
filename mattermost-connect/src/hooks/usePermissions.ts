import { useCallback } from 'react';
import { useAppSelector } from './useAppSelector';
import { 
  selectCurrentUser, 
  selectCurrentTeamId,
  selectCurrentUserRoles,
  selectIsSystemAdmin,
  selectTeamMembers
} from '../store/selectors';
import { Permissions, RolePermissions, SystemRoles, TeamRoles, ChannelRoles } from '../constants/permissions';
import type { Team, Channel } from '../api/types';

// Simple Mattermost pattern for permission checking
export const usePermissions = () => {
  const currentUser = useAppSelector(selectCurrentUser);
  const currentTeamId = useAppSelector(selectCurrentTeamId);
  const systemRoles = useAppSelector(selectCurrentUserRoles);
  const isSystemAdmin = useAppSelector(selectIsSystemAdmin);
  const teamMembers = useAppSelector(selectTeamMembers);

  // Helper to get user roles for a team - simple approach
  const getUserTeamRoles = useCallback((teamId: string): string[] => {
    const member = teamMembers[teamId];
    if (!member?.roles) return [TeamRoles.TEAM_USER];
    return member.roles.split(' ').filter(Boolean);
  }, [teamMembers]);

  // Helper to get all permissions for given roles
  const getPermissionsForRoles = useCallback((roles: string[]): string[] => {
    const permissions = new Set<string>();
    roles.forEach(role => {
      const rolePerms = RolePermissions[role as keyof typeof RolePermissions] || [];
      rolePerms.forEach(perm => permissions.add(perm));
    });
    return Array.from(permissions);
  }, []);

  // System permission check - simple approach
  const haveISystemPermission = useCallback((permission: string): boolean => {
    if (!currentUser) return false;
    
    // System admin has all permissions
    if (isSystemAdmin) return true;
    
    // Check system roles
    const permissions = getPermissionsForRoles(systemRoles);
    return permissions.includes(permission);
  }, [currentUser, isSystemAdmin, systemRoles, getPermissionsForRoles]);

  // Team permission check - simple approach
  const haveITeamPermission = useCallback((teamId: string, permission: string): boolean => {
    if (!currentUser) return false;
    
    // System admin has all permissions
    if (haveISystemPermission(Permissions.MANAGE_SYSTEM)) {
      return true;
    }
    
    // Get team roles and check permissions
    const teamRoles = getUserTeamRoles(teamId);
    const permissions = getPermissionsForRoles(teamRoles);
    
    return permissions.includes(permission);
  }, [currentUser, haveISystemPermission, getUserTeamRoles, getPermissionsForRoles]);

  // Current team permission check - convenience method
  const haveICurrentTeamPermission = useCallback((permission: string): boolean => {
    if (!currentTeamId) return false;
    return haveITeamPermission(currentTeamId, permission);
  }, [currentTeamId, haveITeamPermission]);

  // Channel permission check - simplified for now, can be extended
  const haveIChannelPermission = useCallback((channelId: string, permission: string): boolean => {
    if (!currentUser) return false;
    
    // System admin has all permissions
    if (haveISystemPermission(Permissions.MANAGE_SYSTEM)) {
      return true;
    }
    
    // For now, use team permissions as base (can be extended with channel-specific roles)
    return haveICurrentTeamPermission(permission);
  }, [currentUser, haveISystemPermission, haveICurrentTeamPermission]);

  // Convenience methods - simple and stable
  const canCreateTeam = useCallback((): boolean => {
    return haveISystemPermission(Permissions.CREATE_TEAM);
  }, [haveISystemPermission]);

  const canManageTeam = useCallback((teamId?: string): boolean => {
    const id = teamId || currentTeamId;
    if (!id) return false;
    return haveITeamPermission(id, Permissions.MANAGE_TEAM);
  }, [currentTeamId, haveITeamPermission]);

  const canCreatePublicChannel = useCallback((teamId?: string): boolean => {
    const id = teamId || currentTeamId;
    if (!id) return false;
    return haveITeamPermission(id, Permissions.CREATE_PUBLIC_CHANNEL);
  }, [currentTeamId, haveITeamPermission]);

  const canCreatePrivateChannel = useCallback((teamId?: string): boolean => {
    const id = teamId || currentTeamId;
    if (!id) return false;
    return haveITeamPermission(id, Permissions.CREATE_PRIVATE_CHANNEL);
  }, [currentTeamId, haveITeamPermission]);

  const canInviteUser = useCallback((teamId?: string): boolean => {
    const id = teamId || currentTeamId;
    if (!id) return false;
    return haveITeamPermission(id, Permissions.INVITE_USER);
  }, [currentTeamId, haveITeamPermission]);

  const canAddUserToTeam = useCallback((teamId?: string): boolean => {
    const id = teamId || currentTeamId;
    if (!id) return false;
    return haveITeamPermission(id, Permissions.ADD_USER_TO_TEAM);
  }, [currentTeamId, haveITeamPermission]);

  const canInviteGuest = useCallback((): boolean => {
    return haveISystemPermission(Permissions.INVITE_GUEST);
  }, [haveISystemPermission]);

  const isTeamAdmin = useCallback((teamId?: string): boolean => {
    const id = teamId || currentTeamId;
    if (!id) return false;
    return haveITeamPermission(id, Permissions.MANAGE_TEAM);
  }, [currentTeamId, haveITeamPermission]);

  return {
    // Core permission checks (Mattermost pattern)
    haveISystemPermission,
    haveITeamPermission,
    haveICurrentTeamPermission,
    haveIChannelPermission,
    
    // Convenience methods
    canCreateTeam,
    canManageTeam,
    canCreatePublicChannel,
    canCreatePrivateChannel,
    canInviteUser,
    canAddUserToTeam,
    canInviteGuest,
    isSystemAdmin, // Direct value from selector
    isTeamAdmin,
    
    // Helper methods
    getUserTeamRoles,
    getPermissionsForRoles,
  };
};

export default usePermissions;
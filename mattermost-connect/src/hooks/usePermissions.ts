import { useCallback } from 'react';
import { useAppSelector } from './useAppSelector';
import { Permissions, RolePermissions, SystemRoles, TeamRoles, ChannelRoles } from '../constants/permissions';
import type { Team, Channel } from '../api/types';

// Following Mattermost pattern for permission checking
export const usePermissions = () => {
  const currentUserId = useAppSelector(state => state.entities.users.currentUserId);
  const currentUser = useAppSelector(state => 
    currentUserId ? state.entities.users.profiles[currentUserId] : null
  );
  const currentTeamId = useAppSelector(state => state.entities.teams.currentTeamId);
  const teams = useAppSelector(state => state.entities.teams.teams);
  const teamMembers = useAppSelector(state => state.entities.teams.myMembers);

  // Helper to get user roles for a team
  const getUserTeamRoles = useCallback((teamId: string): string[] => {
    const member = teamMembers[teamId];
    if (!member) return [];
    return member.roles ? member.roles.split(' ') : [TeamRoles.TEAM_USER];
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

  // System permission check - following Mattermost selector pattern
  const haveISystemPermission = useCallback((permission: string): boolean => {
    if (!currentUser) return false;
    
    // Check if user is system admin
    if (currentUser.roles?.includes(SystemRoles.SYSTEM_ADMIN)) {
      return true; // System admin has all permissions
    }
    
    // Get user system roles
    const systemRoles = currentUser.roles ? currentUser.roles.split(' ') : [SystemRoles.SYSTEM_USER];
    const permissions = getPermissionsForRoles(systemRoles);
    
    return permissions.includes(permission);
  }, [currentUser, getPermissionsForRoles]);

  // Team permission check - following Mattermost selector pattern
  const haveITeamPermission = useCallback((teamId: string, permission: string): boolean => {
    if (!currentUser) return false;
    
    // System admin has all permissions
    if (haveISystemPermission(Permissions.MANAGE_SYSTEM)) {
      return true;
    }
    
    // Get team roles for user
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

  // Convenience methods for common checks
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

  const isSystemAdmin = useCallback((): boolean => {
    return haveISystemPermission(Permissions.MANAGE_SYSTEM);
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
    isSystemAdmin,
    isTeamAdmin,
    
    // Helper methods
    getUserTeamRoles,
    getPermissionsForRoles,
  };
};

export default usePermissions;
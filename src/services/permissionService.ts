import { store } from '../store';
import { 
  selectCurrentUser, 
  selectCurrentTeamId,
  selectCurrentUserRoles,
  selectIsSystemAdmin,
} from '../store/selectors';
import { Permissions } from '../constants/permissions';
import { getUserTeamRoles } from '../utils/teamUtils';
import { getPermissionsForRoles } from '../utils/roleUtils';
import type { Channel } from '../api/types';

export const haveISystemPermission = (permission: string): boolean => {
  const state = store.getState();
  const currentUser = selectCurrentUser(state);
  const isSystemAdmin = selectIsSystemAdmin(state);
  const systemRoles = selectCurrentUserRoles(state);
  
  if (!currentUser) return false;
  
  if (isSystemAdmin) return true;
  
  const permissions = getPermissionsForRoles(systemRoles as string[]);
  return permissions.includes(permission);
};

export const haveITeamPermission = (teamId: string, permission: string): boolean => {
  const state = store.getState();
  const currentUser = selectCurrentUser(state);
  
  if (!currentUser) return false;
  
  if (haveISystemPermission(Permissions.MANAGE_SYSTEM)) {
    return true;
  }
  
  const teamRoles = getUserTeamRoles(teamId);
  const permissions = getPermissionsForRoles(teamRoles);
  
  return permissions.includes(permission);
};

export const haveICurrentTeamPermission = (permission: string): boolean => {
  const state = store.getState();
  const currentTeamId = selectCurrentTeamId(state);
  
  if (!currentTeamId) return false;
  return haveITeamPermission(currentTeamId, permission);
};

export const haveIChannelPermission = (channelId: string, permission: string): boolean => {
  const state = store.getState();
  const currentUser = selectCurrentUser(state);
  
  if (!currentUser) return false;
  
  if (haveISystemPermission(Permissions.MANAGE_SYSTEM)) {
    return true;
  }
  
  return haveICurrentTeamPermission(permission);
};

export const canCreateTeam = (): boolean => {
  return haveISystemPermission(Permissions.CREATE_TEAM);
};

export const canManageTeam = (teamId?: string): boolean => {
  const state = store.getState();
  const currentTeamId = selectCurrentTeamId(state);
  const id = teamId || currentTeamId;
  if (!id) return false;
  return haveITeamPermission(id, Permissions.MANAGE_TEAM);
};

export const canCreatePublicChannel = (teamId?: string): boolean => {
  const state = store.getState();
  const currentTeamId = selectCurrentTeamId(state);
  const id = teamId || currentTeamId;
  if (!id) return false;
  return haveITeamPermission(id, Permissions.CREATE_PUBLIC_CHANNEL);
};

export const canCreatePrivateChannel = (teamId?: string): boolean => {
  const state = store.getState();
  const currentTeamId = selectCurrentTeamId(state);
  const id = teamId || currentTeamId;
  if (!id) return false;
  return haveITeamPermission(id, Permissions.CREATE_PRIVATE_CHANNEL);
};

export const canInviteUser = (teamId?: string): boolean => {
  const state = store.getState();
  const currentTeamId = selectCurrentTeamId(state);
  const id = teamId || currentTeamId;
  if (!id) return false;
  return haveITeamPermission(id, Permissions.INVITE_USER);
};

export const canAddUserToTeam = (teamId?: string): boolean => {
  const state = store.getState();
  const currentTeamId = selectCurrentTeamId(state);
  const id = teamId || currentTeamId;
  if (!id) return false;
  return haveITeamPermission(id, Permissions.ADD_USER_TO_TEAM);
};

export const canInviteGuest = (): boolean => {
  return haveISystemPermission(Permissions.INVITE_GUEST);
};

export const isTeamAdmin = (teamId?: string): boolean => {
  const state = store.getState();
  const currentTeamId = selectCurrentTeamId(state);
  const id = teamId || currentTeamId;
  if (!id) return false;
  return haveITeamPermission(id, Permissions.MANAGE_TEAM);
};

export const canManageChannelMembers = (channel: Channel): boolean => {
  const state = store.getState();
  const currentUser = selectCurrentUser(state);
  
  if (!channel || !currentUser) return false;

  if (channel.type === 'D') return false;

  if (haveISystemPermission(Permissions.MANAGE_SYSTEM)) {
    return true;
  }

  const permission = channel.type === 'P' 
    ? Permissions.MANAGE_PRIVATE_CHANNEL_MEMBERS 
    : Permissions.MANAGE_PUBLIC_CHANNEL_MEMBERS;
  
  return haveIChannelPermission(channel.id, permission);
};

export const isSystemAdmin = (): boolean => {
  const state = store.getState();
  return selectIsSystemAdmin(state);
};
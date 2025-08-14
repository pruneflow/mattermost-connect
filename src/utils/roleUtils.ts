import { RolePermissions } from '../constants/permissions';

// Helper to get all permissions for given roles
export const getPermissionsForRoles = (roles: string[]): string[] => {
  const permissions = new Set<string>();
  roles.forEach(role => {
    const rolePerms = RolePermissions[role as keyof typeof RolePermissions] || [];
    rolePerms.forEach(perm => permissions.add(perm));
  });
  return Array.from(permissions);
};
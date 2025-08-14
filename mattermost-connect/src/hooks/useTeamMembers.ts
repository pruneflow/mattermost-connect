import { useState, useCallback, useEffect } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { handleError } from '../services/errorService';
import { useTeamStats } from './useTeamStats';
import { updateTeamMemberRoles, removeUserFromTeam } from '../store/slices/entitiesSlice';
import { selectTeamMembers } from '../store/selectors';
import { client } from '../api/client';
import type { UserProfile, TeamMember } from '../api/types';

/**
 * Hook for loading team members following exact Mattermost pattern
 * Keeps users and teamMembers separate to avoid role conflicts
 * Loads fresh data on each call (no caching) - exactly like Mattermost does
 */
export const useTeamMembers = (teamId: string | null) => {
  const dispatch = useAppDispatch();
  const { stats, loading: statsLoading } = useTeamStats(teamId || '');
  
  // Watch Redux store for team member changes to trigger reload
  const reduxTeamMembers = useAppSelector(state => selectTeamMembers(state, teamId || ''));
  
  const [loading, setLoading] = useState(false);
  // ✅ Exactly like Mattermost: separate arrays, no conflicts
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ [userId: string]: TeamMember }>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [lastReduxUpdateTime, setLastReduxUpdateTime] = useState(Date.now());
  
  /**
   * Load team members for specific page - following Mattermost's exact pattern:
   * 1. GET /api/v4/users?active=true&in_team={teamId}&page={page}&per_page=100&sort=
   * 2. GET /api/v4/teams/{teamId}/members?page={page}&per_page=50&sort=Username&exclude_deleted_users=true
   * Note: Team stats are handled by useTeamStats hook
   */
  const loadTeamMembers = useCallback(async (page = 0) => {
    if (!teamId) return;
    
    setLoading(true);
    try {
      
      // Run API calls in parallel for better performance
      const [profilesInTeam, membersInTeam] = await Promise.all([
        // 1. Get active users in team (exactly like Mattermost)
        client.getProfilesInTeam(teamId, page, 100, '', {
          active: true,
        }),
        
        // 2. Get team members with roles (exactly like Mattermost)
        client.getTeamMembers(teamId, page, 50, {
          sort: 'Username',
          exclude_deleted_users: true,
        }),
      ]);

      // ✅ Mattermost pattern: convert array to dictionary by user_id
      const teamMembersById: { [userId: string]: TeamMember } = {};
      membersInTeam.forEach(member => {
        teamMembersById[member.user_id] = member;
      });
      
      // ✅ Store separately like Mattermost (NO role conflicts)
      setUsers(profilesInTeam);
      setTeamMembers(teamMembersById);
      setCurrentPage(page);
      
      
    } catch (error) {
      handleError(error, {
        component: 'useTeamMembers',
        action: 'loadTeamMembers',
        showToast: true,
      });
    } finally {
      setLoading(false);
    }
  }, [teamId, handleError]);
  
  // ✅ Sync with Redux store changes (when members are added/removed)
  useEffect(() => {
    // Only reload if we have data already loaded and Redux store changed
    if (users.length > 0 && reduxTeamMembers && Object.keys(reduxTeamMembers).length > 0) {
      const reduxMemberCount = Object.keys(reduxTeamMembers).length;
      const localMemberCount = Object.keys(teamMembers).length;
      
      // If member counts differ, Redux was updated - reload current page
      if (reduxMemberCount !== localMemberCount) {
        setLastReduxUpdateTime(Date.now());
        loadTeamMembers(currentPage);
      }
    }
  }, [reduxTeamMembers, users.length, teamMembers, currentPage, loadTeamMembers]);
  
  // ✅ Filter active members exactly like Mattermost
  const activeMembers = users.filter(user => {
    const teamMember = teamMembers[user.id];
    return teamMember && !teamMember.delete_at;
  });
  
  // Pagination helpers
  const totalPages = stats ? Math.ceil(stats.total_member_count / 50) : 0;
  const hasNextPage = currentPage < totalPages - 1;
  const hasPrevPage = currentPage > 0;
  
  const loadNextPage = useCallback(() => {
    if (hasNextPage) {
      loadTeamMembers(currentPage + 1);
    }
  }, [currentPage, hasNextPage, loadTeamMembers]);
  
  const loadPrevPage = useCallback(() => {
    if (hasPrevPage) {
      loadTeamMembers(currentPage - 1);
    }
  }, [currentPage, hasPrevPage, loadTeamMembers]);
  
  const goToPage = useCallback((page: number) => {
    if (page >= 0 && page < totalPages) {
      loadTeamMembers(page);
    }
  }, [totalPages, loadTeamMembers]);

  const updateMemberRole = useCallback(async (userId: string, isSchemeAdmin: boolean) => {
    if (!teamId) return;
    
    try {
      await dispatch(updateTeamMemberRoles({ teamId, userId, isSchemeAdmin })).unwrap();
      setTeamMembers(prev => {
        const updated = { ...prev };
        if (updated[userId]) {
          updated[userId] = {
            ...updated[userId],
            roles: isSchemeAdmin ? 'team_admin team_user' : 'team_user'
          };
        }
        return updated;
      });
    } catch (error) {
      handleError(error, {
        component: 'useTeamMembers',
        action: 'updateMemberRole',
        showToast: true,
      });
      throw error;
    }
  }, [teamId, dispatch, handleError]);

  const removeMember = useCallback(async (userId: string) => {
    if (!teamId) return;
    
    try {
      await dispatch(removeUserFromTeam({ teamId, userId })).unwrap();
      setUsers(prev => prev.filter(user => user.id !== userId));
      setTeamMembers(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    } catch (error) {
      handleError(error, {
        component: 'useTeamMembers',
        action: 'removeMember',
        showToast: true,
      });
      throw error;
    }
  }, [teamId, dispatch, handleError]);
  
  // ✅ Get admin count from teamMembers (not user roles)
  const adminCount = Object.values(teamMembers).filter(member => 
    member?.roles?.includes('team_admin')
  ).length;
  
  return {
    // ✅ Data exactly like Mattermost: separated, no conflicts
    users,                    // UserProfile[] - system level data
    teamMembers,             // { [userId]: TeamMember } - team level data
    activeMembers,           // Filtered users that are active team members
    stats,                   // Team statistics from useTeamStats
    adminCount,              // Count from team roles (not user roles)
    
    // Pagination state
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    
    // State
    loading: loading || statsLoading, // Combined loading state
    
    // Actions
    loadTeamMembers,
    loadNextPage,
    loadPrevPage,
    goToPage,
    updateMemberRole,        // Update member role and store
    removeMember,            // Remove member and update store
  };
};

export default useTeamMembers;
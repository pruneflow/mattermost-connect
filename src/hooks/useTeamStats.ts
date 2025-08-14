import { useCallback, useEffect } from 'react';
import { useAppDispatch } from './useAppDispatch';
import { useAppSelector } from './useAppSelector';
import { handleError } from '../services/errorService';
import { selectTeamStatsById } from '../store/selectors';
import { setTeamStats, incrementTeamMemberCount, decrementTeamMemberCount } from '../store/slices/entitiesSlice';
import { client } from '../api/client';
import type { TeamStats } from '../api/types';

export const useTeamStats = (teamId: string) => {
  const dispatch = useAppDispatch();
  
  const stats = useAppSelector(state => selectTeamStatsById(teamId)(state));
  
  const loadStats = useCallback(async () => {
    if (!teamId) return;
    // Only skip if we have real stats (not the default EMPTY_TEAM_STATS)
    if (stats && stats.total_member_count > 0) return;
    
    try {
      const teamStats = await client.getTeamStats(teamId);
      dispatch(setTeamStats({ teamId, stats: teamStats }));
    } catch (error) {
      handleError(error, {
        component: 'useTeamStats',
        action: 'loadStats',
        showToast: false,
      });
    }
  }, [teamId, stats, dispatch, handleError]);


  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading: teamId ? !stats : false, // No loading if no teamId
    reload: loadStats,
  };
};

export default useTeamStats;
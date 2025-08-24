import { useState, useCallback } from 'react';
import { client } from '../api/client';
import { handleError } from '../services/errorService';
import { useAppDispatch, useAppSelector } from './index';
import { selectCanSendEmailInvitationsServerSide } from '../store/selectors/configSelectors';
import { addUsersToTeam } from '../store/slices/entitiesSlice';

export interface InvitationResult {
  success: boolean;
  message?: string;
  failed_emails?: string[];
}

export interface GuestInvitationParams {
  emails: string[];
  channelIds: string[];
  message?: string;
}

/**
 * Hook for team invitation functionality following Mattermost patterns
 * Provides email invitations, guest invitations, and invite link management
 */
export const useTeamInvitations = (teamId: string) => {
  const dispatch = useAppDispatch();
  const canSendEmailInvitationsServerSide = useAppSelector(selectCanSendEmailInvitationsServerSide);
  
  // Loading states for different invitation types
  const [isEmailInviting, setIsEmailInviting] = useState(false);
  const [isGuestInviting, setIsGuestInviting] = useState(false);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [isLoadingInviteInfo, setIsLoadingInviteInfo] = useState(false);
  
  // Invite link state
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  /**
   * Send email invitations to new users (standard members)
   * Uses graceful endpoint to continue even if some emails fail
   * STEP 1: Check server configuration
   * STEP 2: User preferences should be checked by calling component if needed
   */
  const sendEmailInvitations = useCallback(async (emails: string[]): Promise<InvitationResult> => {
    if (!teamId || emails.length === 0) {
      return { success: false, message: 'Missing team ID or emails' };
    }

    // STEP 1: Check server-side email invitations capability
    if (!canSendEmailInvitationsServerSide) {
      return { 
        success: false, 
        message: 'Email invitations are disabled on this server or SMTP is not configured' 
      };
    }

    setIsEmailInviting(true);
    try {
      // Use graceful invitation to get detailed results
      const result = await client.sendEmailInvitesToTeamGracefully(teamId, emails);
      
      // Result is an array of TeamInviteWithError - filter failed ones
      const failed_emails = result.filter((invite: any) => invite.error).map((invite: any) => invite.email) || [];
      const success = failed_emails.length === 0;
      
      return {
        success,
        message: success 
          ? `Invitations sent to ${emails.length} email(s)`
          : `${emails.length - failed_emails.length} invitations sent, ${failed_emails.length} failed`,
        failed_emails
      };
    } catch (error) {
      handleError('Failed to send email invitations', error as any);
      return { success: false, message: 'Failed to send invitations' };
    } finally {
      setIsEmailInviting(false);
    }
  }, [teamId]); // Remove handleError dependency

  /**
   * Send guest invitations with limited channel access
   * STEP 1: Check server configuration
   * STEP 2: User preferences should be checked by calling component if needed
   */
  const sendGuestInvitations = useCallback(async (params: GuestInvitationParams): Promise<InvitationResult> => {
    if (!teamId || params.emails.length === 0 || params.channelIds.length === 0) {
      return { success: false, message: 'Missing team ID, emails, or channels' };
    }

    // STEP 1: Check server-side email invitations capability
    if (!canSendEmailInvitationsServerSide) {
      return { 
        success: false, 
        message: 'Email invitations are disabled on this server or SMTP is not configured' 
      };
    }

    setIsGuestInviting(true);
    try {
      const result = await client.sendEmailGuestInvitesToChannelsGracefully(
        teamId,
        params.channelIds,
        params.emails,
        params.message || ''
      );
      
      // Result is an array of TeamInviteWithError - filter failed ones
      const failed_emails = result.filter((invite: any) => invite.error).map((invite: any) => invite.email) || [];
      const success = failed_emails.length === 0;
      
      return {
        success,
        message: success 
          ? `Guest invitations sent to ${params.emails.length} email(s)`
          : `${params.emails.length - failed_emails.length} guest invitations sent, ${failed_emails.length} failed`,
        failed_emails
      };
    } catch (error) {
      handleError('Failed to send guest invitations', error as any);
      return { success: false, message: 'Failed to send guest invitations' };
    } finally {
      setIsGuestInviting(false);
    }
  }, [teamId, handleError]);

  /**
   * Add existing users to the team
   */
  const addMembersToTeam = useCallback(async (userIds: string[]): Promise<InvitationResult> => {
    if (!teamId || userIds.length === 0) {
      return { success: false, message: 'Missing team ID or user IDs' };
    }

    setIsAddingMembers(true);
    try {
      // Use Redux action instead of direct client call to ensure store sync
      await dispatch(addUsersToTeam({ teamId, userIds })).unwrap();
      
      return {
        success: true,
        message: `${userIds.length} member(s) added to team`
      };
    } catch (error) {
      handleError('Failed to add members to team', error as any);
      return { success: false, message: 'Failed to add members' };
    } finally {
      setIsAddingMembers(false);
    }
  }, [teamId, dispatch, handleError]);

  /**
   * Get team invite link information
   */
  const getInviteLink = useCallback(async (): Promise<string | null> => {
    if (!teamId) return null;

    setIsLoadingInviteInfo(true);
    try {
      // Get team invite info to build invite link
      const teamData = await client.getTeam(teamId);
      if (teamData.invite_id) {
        const inviteUrl = `${client.getUrl()}/signup_user_complete/?id=${teamData.invite_id}`;
        setInviteLink(inviteUrl);
        return inviteUrl;
      }
      return null;
    } catch (error) {
      handleError('Failed to get invite link', error as any);
      return null;
    } finally {
      setIsLoadingInviteInfo(false);
    }
  }, [teamId, handleError]);

  /**
   * Copy invite link to clipboard
   */
  const copyInviteLink = useCallback(async (): Promise<boolean> => {
    const link = inviteLink || await getInviteLink();
    if (!link) return false;

    try {
      await navigator.clipboard.writeText(link);
      return true;
    } catch (error) {
      // Failed to copy to clipboard
      return false;
    }
  }, [inviteLink, getInviteLink]);

  /**
   * Validate email addresses
   */
  const validateEmails = useCallback((emails: string[]): { valid: string[]; invalid: string[] } => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const valid: string[] = [];
    const invalid: string[] = [];

    emails.forEach(email => {
      const trimmed = email.trim();
      if (trimmed && emailRegex.test(trimmed)) {
        valid.push(trimmed);
      } else if (trimmed) {
        invalid.push(trimmed);
      }
    });

    return { valid, invalid };
  }, []);

  return {
    // State
    isEmailInviting,
    isGuestInviting,
    isAddingMembers,
    isLoadingInviteInfo,
    inviteLink,

    // Actions
    sendEmailInvitations,
    sendGuestInvitations,
    addMembersToTeam,
    getInviteLink,
    copyInviteLink,
    validateEmails,

    // Server capabilities
    canSendEmailInvitationsServerSide,

    // Computed
    isLoading: isEmailInviting || isGuestInviting || isAddingMembers || isLoadingInviteInfo,
  };
};

export default useTeamInvitations;
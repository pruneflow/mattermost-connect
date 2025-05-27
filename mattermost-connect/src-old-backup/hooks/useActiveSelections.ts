import { useState, useEffect, useCallback } from "react";
import { Team, Channel } from "../api/types";

// Global state for active selections - shared across all components
let globalActiveTeam: Team | null = null;
let globalActiveChannel: Channel | null = null;
let globalSubscribers = new Set<() => void>();

// Auto-selection management
let hasAutoSelectedTeam = false;
let hasAutoSelectedChannelForTeam: Record<string, boolean> = {};

// Notify all subscribers about state changes
const notifySubscribers = () => {
  globalSubscribers.forEach((callback) => callback());
};

// Channel sorting logic for auto-selection
const sortChannelsForSelection = (channels: Channel[]): Channel[] => {
  return [...channels].sort((a, b) => {
    // Public channels first, then private, then direct
    if (a.type === "O" && b.type !== "O") return -1;
    if (a.type !== "O" && b.type === "O") return 1;
    if (a.type === "P" && b.type === "D") return -1;
    if (a.type === "D" && b.type === "P") return 1;
    // Alphabetical by display name or name
    return (a.display_name || a.name).localeCompare(b.display_name || b.name);
  });
};

/**
 * Global hook for managing active team and channel selections
 * with automatic selection of first available items
 */
export function useActiveSelections() {
  const [, forceUpdate] = useState({});

  // Force re-render when global state changes
  const triggerUpdate = useCallback(() => {
    forceUpdate({});
  }, []);

  // Subscribe to global state changes
  useEffect(() => {
    globalSubscribers.add(triggerUpdate);
    return () => {
      globalSubscribers.delete(triggerUpdate);
    };
  }, [triggerUpdate]);

  // Set active team with auto-selection logic
  const setActiveTeam = useCallback((team: Team | null) => {
    const hasChanged = globalActiveTeam?.id !== team?.id;

    if (hasChanged) {
      globalActiveTeam = team;

      // Clear active channel when team changes
      globalActiveChannel = null;

      // Reset auto-selection flag for the new team
      if (team) {
        hasAutoSelectedChannelForTeam[team.id] = false;
      }

      notifySubscribers();
    }
  }, []);

  // Set active channel
  const setActiveChannel = useCallback((channel: Channel | null) => {
    const hasChanged = globalActiveChannel?.id !== channel?.id;

    if (hasChanged) {
      globalActiveChannel = channel;
      notifySubscribers();
    }
  }, []);

  // Auto-select first team from available teams
  const autoSelectFirstTeam = useCallback(
    (teams: Team[]) => {
      if (!hasAutoSelectedTeam && teams.length > 0 && !globalActiveTeam) {
        const firstTeam = teams[0];
        setActiveTeam(firstTeam);
        hasAutoSelectedTeam = true;

        if (process.env.NODE_ENV !== "production") {
          console.log("Auto-selected first team:", firstTeam.display_name);
        }
      }
    },
    [setActiveTeam],
  );

  // Auto-select first channel for the active team
  const autoSelectFirstChannel = useCallback(
    (channels: Channel[], teamId: string) => {
      // Only auto-select if:
      // 1. We have channels
      // 2. No channel is currently selected
      // 3. We haven't already auto-selected for this team
      const shouldAutoSelect =
        channels.length > 0 &&
        !globalActiveChannel &&
        !hasAutoSelectedChannelForTeam[teamId];

      if (shouldAutoSelect) {
        const sortedChannels = sortChannelsForSelection(channels);
        const firstChannel = sortedChannels[0];

        setActiveChannel(firstChannel);
        hasAutoSelectedChannelForTeam[teamId] = true;

        if (process.env.NODE_ENV !== "production") {
          console.log(
            `Auto-selected first channel for team ${teamId}:`,
            firstChannel.display_name || firstChannel.name,
          );
        }
      }
    },
    [setActiveChannel],
  );

  // Reset auto-selection flags (useful for testing or re-initialization)
  const resetAutoSelection = useCallback(() => {
    hasAutoSelectedTeam = false;
    hasAutoSelectedChannelForTeam = {};
  }, []);

  return {
    // Current active selections
    activeTeam: globalActiveTeam,
    activeChannel: globalActiveChannel,

    // Setters
    setActiveTeam,
    setActiveChannel,

    // Auto-selection helpers
    autoSelectFirstTeam,
    autoSelectFirstChannel,
    resetAutoSelection,

    // Utility functions
    sortChannelsForSelection,
  };
}

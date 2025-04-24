// src/core/store/thunks/channels.thunks.ts
import { ApiClient } from "../../api/client";
import { CacheService } from "../../services/cache.service";
import { Dispatch } from "../store";
import { Channel } from "../slices/channels.slice";

/**
 * Charge les canaux d'une équipe
 */
export const getChannels =
  (
    apiClient: ApiClient,
    cacheService: CacheService,
    teamId: string,
    options: { forceRefresh?: boolean } = {},
  ) =>
  async (dispatch: Dispatch) => {
    if (!teamId) return [];

    dispatch({
      type: "CHANNELS_FETCH_REQUEST",
      payload: { teamId },
    });

    try {
      // Vérifier le cache
      const cacheKey = `channels_${teamId}`;
      if (!options.forceRefresh) {
        const cachedChannels = cacheService.get(cacheKey) as
          | Channel[]
          | undefined;
        if (cachedChannels) {
          dispatch({
            type: "CHANNELS_FETCH_SUCCESS",
            payload: { teamId, channels: cachedChannels },
          });
          return cachedChannels;
        }
      }

      // Appel API
      const response = await apiClient.get<Channel[]>(
        `users/me/teams/${teamId}/channels`,
      );
      const channels = response.data;

      // Mettre à jour le cache
      cacheService.set(cacheKey, channels);

      // Dispatch du succès
      dispatch({
        type: "CHANNELS_FETCH_SUCCESS",
        payload: { teamId, channels },
      });

      return channels;
    } catch (error) {
      dispatch({
        type: "CHANNELS_FETCH_ERROR",
        payload: { teamId, error },
      });
      return [];
    }
  };

/**
 * Charge un canal spécifique
 */
export const getChannel =
  (
    apiClient: ApiClient,
    cacheService: CacheService,
    channelId: string,
    options: { forceRefresh?: boolean } = {},
  ) =>
  async (dispatch: Dispatch) => {
    if (!channelId) return null;

    dispatch({
      type: "CHANNEL_FETCH_REQUEST",
      payload: { channelId },
    });

    try {
      // Vérifier le cache
      const cacheKey = `channel_${channelId}`;
      if (!options.forceRefresh) {
        const cachedChannel = cacheService.get(cacheKey) as Channel | undefined;
        if (cachedChannel) {
          dispatch({
            type: "CHANNEL_FETCH_SUCCESS",
            payload: { channel: cachedChannel },
          });
          return cachedChannel;
        }
      }

      // Appel API
      const response = await apiClient.get<Channel>(`channels/${channelId}`);
      const channel = response.data;

      // Mettre à jour le cache
      cacheService.set(cacheKey, channel);

      // Dispatch du succès
      dispatch({
        type: "CHANNEL_FETCH_SUCCESS",
        payload: { channel },
      });

      return channel;
    } catch (error) {
      dispatch({
        type: "CHANNEL_FETCH_ERROR",
        payload: { channelId, error },
      });
      return null;
    }
  };

/**
 * Sélectionne un canal actif
 */
export const selectChannel =
  (channel: Channel | null, apiClient: ApiClient) =>
  async (dispatch: Dispatch) => {
    dispatch({
      type: "CHANNELS_SET_ACTIVE",
      payload: { channel },
    });

    // Si un canal est sélectionné, le marquer comme lu
    if (channel) {
      dispatch(viewChannel(apiClient, channel.id));
    }

    return channel;
  };

/**
 * Marque un canal comme lu
 */
export const viewChannel =
  (apiClient: ApiClient, channelId: string) => async (dispatch: Dispatch) => {
    if (!channelId) return false;

    try {
      await apiClient.post("channels/members/me/view", {
        channel_id: channelId,
      });

      dispatch({
        type: "CHANNELS_MARK_AS_READ",
        payload: { channelId },
      });

      return true;
    } catch (error) {
      console.error(`Error marking channel ${channelId} as read:`, error);
      return false;
    }
  };

import {
  markChannelAsRead,
  store,
  setCurrentChannelId,
  markChannelAsUnread,
  moveChannelToCategoryAction,
  muteChannelAction,
  leaveChannelAction,
} from "../store";
import {
  selectCurrentTeamId,
  selectChannelsForCurrentTeam,
  selectCurrentChannel,
  selectCategoriesForCurrentTeam,
  selectCurrentUserId, selectIsChannelFavorite,
} from "../store/selectors";
import { selectChannelByRules } from "../utils/channelUtils";
import type { EnrichedChannel } from "../api/types";

export const switchToChannel = (channelId: string) => {
  store.dispatch(setCurrentChannelId(channelId));
};

export const markAsUnread = async (channelId: string) => {
  await store.dispatch(markChannelAsUnread({ channelId }));
};

// Mark channel as read using Redux action (stable reference)
export const markAsRead = async (channelId: string) => {
  await store.dispatch(markChannelAsRead(channelId));
};

export const moveToCategory = (channelId: string, toCategoryId: string) => {
  const state = store.getState();
  const categories = selectCategoriesForCurrentTeam(state);

  const fromCategory = categories.find((cat) =>
    cat.channel_ids.includes(channelId),
  );
  if (!fromCategory || fromCategory.id === toCategoryId) return;

  store.dispatch(
    moveChannelToCategoryAction({
      channelId,
      fromCategoryId: fromCategory.id,
      toCategoryId,
    }),
  );
};

export const toggleFavorite = (channelId: string, isFavorite: boolean) => {
  const state = store.getState();
  const currentTeamId = selectCurrentTeamId(state);
  const categories = selectCategoriesForCurrentTeam(state);
  const allChannels = selectChannelsForCurrentTeam(state);

  if (!currentTeamId) return;

  const favoritesCategory = categories.find((cat) => cat.type === "favorites");
  let categoryId = null;

  if (isFavorite) {
    const channel = allChannels?.find(
      (c: EnrichedChannel) => c.id === channelId,
    );
    if (channel && channel.type === "D") {
      const directCategory = categories.find(
        (c) => c.type === "direct_messages",
      );
      categoryId = directCategory?.id;
    } else {
      const channelsCategory = categories.find((c) => c.type === "channels");
      categoryId = channelsCategory?.id;
    }
  } else {
    categoryId = favoritesCategory?.id;
  }

  if (categoryId) {
    moveToCategory(channelId, categoryId);
  }
};

export const muteChannel = (channelId: string, muted: boolean) => {
  const state = store.getState();
  const currentUserId = selectCurrentUserId(state);

  if (!currentUserId) return;

  store.dispatch(
    muteChannelAction({ channelId, userId: currentUserId, muted }),
  );
};

export const leaveChannel = async (channelId: string) => {
  const state = store.getState();
  const currentUserId = selectCurrentUserId(state);
  const currentChannel = selectCurrentChannel(state);
  const allChannels = selectChannelsForCurrentTeam(state);

  if (!currentUserId) return;

  const leavingCurrentChannel = currentChannel?.id === channelId;

  await store.dispatch(
    leaveChannelAction({ channelId, userId: currentUserId }),
  );

  if (leavingCurrentChannel) {
    const newChannelId = selectChannelByRules(
      channelId,
      allChannels as EnrichedChannel[],
      true,
    );
    if (newChannelId) {
      switchToChannel(newChannelId);
    }
  }
};

export const isChannelFavorite = (channelId: string): boolean => {
  const state = store.getState();
  return selectIsChannelFavorite(state, channelId);
};

export const getChannelCategory = (channelId: string) => {
  const state = store.getState();
  const categories = selectCategoriesForCurrentTeam(state);
  return categories.find((cat) => cat.channel_ids.includes(channelId));
};

export const getCategories = () => {
  const state = store.getState();
  return selectCategoriesForCurrentTeam(state);
};

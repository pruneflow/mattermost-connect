import React, { useMemo, useCallback } from "react";
import { useAppDispatch } from "../../../../hooks";
import type { ActionResult, LoadPostsReturnValue, LoadPostsParameters } from "../../../../api/types";

import {
  getRecentPostsChunkInChannel,
  getUnreadPostsChunk,
  getPost,
  isPostsChunkIncludingUnreadsPosts,
  makePreparePostIdsForPostList,
  selectChannelsViews,
  selectPostsInChannel,
} from "../../../../store/selectors";

import {
  loadPosts,
  loadUnreads,
  loadPostsAround,
  syncPostsInChannel,
  loadLatestPosts,
} from "../../../../store/slices/entitiesSlice";

import { updateNewMessagesAtInChannel } from "../../../../store";
import { useAppSelector, useUnreadCounts } from "../../../../hooks";
import useLayout from "../../../../hooks/useLayout";

import { memoizeResult } from "../../../../utils/selectorsHelper";
import { getLatestPostId } from "../../../../utils/postUtils";

import { PostList } from "./PostList";

type Props = {
  unreadChunkTimeStamp?: number;
  changeUnreadChunkTimeStamp: (lastViewedAt: number) => void;
  channelId: string;
  shouldStartFromBottomWhenUnread: boolean;
  toggleShouldStartFromBottomWhenUnread: () => void;
};

const memoizedGetLatestPostId = memoizeResult((postIds: string[]) =>
  getLatestPostId(postIds),
);

export const PostListContainer = ({
  unreadChunkTimeStamp,
  channelId,
  shouldStartFromBottomWhenUnread,
  changeUnreadChunkTimeStamp,
  toggleShouldStartFromBottomWhenUnread,
}: Props) => {
  const dispatch = useAppDispatch();
  const { markChannelAsRead } = useUnreadCounts();
  const { isMobile } = useLayout();

  const channelViewState = useAppSelector(selectChannelsViews);
  const lastViewedAt = channelViewState.lastViewedAtByChannel[channelId];

  const preparePostIdsForPostList = useMemo(
    () => makePreparePostIdsForPostList(),
    [],
  );

  // Sélecteurs toujours au niveau racine
  const postsInChannel = useAppSelector(selectPostsInChannel);

  const chunk = useAppSelector(
    useCallback((state) => {
      if (unreadChunkTimeStamp && !shouldStartFromBottomWhenUnread) {
        return getUnreadPostsChunk(state, channelId, unreadChunkTimeStamp);
      }
      return getRecentPostsChunkInChannel(state, channelId);
    }, [unreadChunkTimeStamp, shouldStartFromBottomWhenUnread, channelId])
  );

  const postIds = useMemo(() => chunk?.order || [], [chunk?.order]);
  const atLatestPost = useMemo(() => !!chunk?.recent, [chunk?.recent]);
  const atOldestPost = useMemo(() => !!chunk?.oldest, [chunk?.oldest]);

  // Toujours appeler useAppSelector de manière inconditionnelle
  const isChunkIncludingUnreads = useAppSelector(
    useCallback((state) => {
      if (!chunk || unreadChunkTimeStamp == null) return false;
      return isPostsChunkIncludingUnreadsPosts(state, chunk, unreadChunkTimeStamp);
    }, [chunk, unreadChunkTimeStamp])
  );

  const shouldHideNewMessageIndicator = useMemo(() => {
    return (
      unreadChunkTimeStamp != null &&
      shouldStartFromBottomWhenUnread &&
      chunk &&
      !isChunkIncludingUnreads
    );
  }, [unreadChunkTimeStamp, shouldStartFromBottomWhenUnread, chunk, isChunkIncludingUnreads]);

  // Mémoriser les options pour éviter la recréation d'objet à chaque render
  const prepareOptions = useMemo(() => ({
    postIds,
    lastViewedAt,
    indicateNewMessages: !shouldHideNewMessageIndicator,
  }), [postIds, lastViewedAt, shouldHideNewMessageIndicator]);

  const formattedPostIds = useAppSelector((state) => 
    preparePostIdsForPostList(state, prepareOptions)
  );

  // Calculer le timestamp du dernier post de manière inconditionnelle
  const latestPostId = useMemo(() => {
    return postIds.length > 0 ? memoizedGetLatestPostId(postIds) : null;
  }, [postIds]);

  const latestPost = useAppSelector(
    useCallback((state) => {
      return latestPostId ? getPost(state, latestPostId) : null;
    }, [latestPostId])
  );

  const latestPostTimeStamp = useMemo(() => {
    return latestPost?.create_at || 0;
  }, [latestPost]);

  const isFirstLoad = useMemo(() => !postsInChannel[channelId], [postsInChannel, channelId]);


  const actions = useMemo(() => ({
    loadPostsAround: (params: { channelId: string; focusedPostId: string; }): Promise<ActionResult> => {
      return dispatch(loadPostsAround(params)) as Promise<ActionResult>;
    },
    loadUnreads: (channelId: string): Promise<ActionResult> => {
      return dispatch(loadUnreads(channelId)) as Promise<ActionResult>;
    },
    loadPosts: (parameters: LoadPostsParameters): Promise<LoadPostsReturnValue> => {
      return dispatch(loadPosts(parameters)).unwrap();
    },
    loadLatestPosts: (channelId: string): Promise<ActionResult> => {
      return dispatch(loadLatestPosts(channelId)) as Promise<ActionResult>;
    },
    syncPostsInChannel: (params: { channelId: string; since: number; }): Promise<ActionResult> => {
      return dispatch(syncPostsInChannel(params)) as Promise<ActionResult>;
    },
    markChannelAsRead,
    updateNewMessagesAtInChannel,
  }), [dispatch]);

  return (
      <PostList
        lastViewedAt={lastViewedAt}
        isFirstLoad={isFirstLoad}
        formattedPostIds={formattedPostIds}
        atLatestPost={atLatestPost}
        atOldestPost={atOldestPost}
        latestPostTimeStamp={latestPostTimeStamp}
        postListIds={postIds}
        shouldStartFromBottomWhenUnread={shouldStartFromBottomWhenUnread}
        isMobileView={isMobile}
        changeUnreadChunkTimeStamp={changeUnreadChunkTimeStamp}
        toggleShouldStartFromBottomWhenUnread={
          toggleShouldStartFromBottomWhenUnread
        }
        actions={actions}
        channelId={channelId}
        isPrefetchingInProcess={false}
        hasInaccessiblePosts={false}
      />
  );
};

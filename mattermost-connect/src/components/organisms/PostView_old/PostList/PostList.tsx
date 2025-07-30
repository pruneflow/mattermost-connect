import React, { useRef, useState, useEffect, useCallback } from "react";
import { PostListVirtualized } from "./PostListVirtualized";

import {
  ActionResult,
  LoadPostsParameters,
  LoadPostsReturnValue,
  PostRequestTypes,
} from "../../../../api/types";
import { updateNewMessagesAtInChannel } from "../../../../store";
import LoadingScreen from "../../../common/LoadingScreen";
import { getLatestPostId, getOldestPostId } from "../../../../utils/postUtils";

// EXACT Mattermost constants
const MAX_NUMBER_OF_AUTO_RETRIES = 3;
const MAX_EXTRA_PAGES_LOADED = 5;

type CanLoadMorePosts =
  | typeof PostRequestTypes.BEFORE_ID
  | typeof PostRequestTypes.AFTER_ID;

interface Props {
  /**
   *  Array of formatted post ids in the channel
   *  This will be different from postListIds because of grouping and filtering of posts
   *  This array should be used for making Before and After API calls
   */
  formattedPostIds?: string[];

  /**
   *  Array of post ids in the channel, ordered from newest to oldest
   */
  postListIds?: string[];

  /**
   * The channel the posts are in
   */
  channelId: string;
  /*
   * Used for determining if we are not at the recent most chunk in channel
   */
  atLatestPost: boolean;

  /*
   * Used for determining if we are at the channels oldest post
   */
  atOldestPost?: boolean;

  /*
   * Used for loading posts using unread API
   */
  isFirstLoad: boolean;

  /*
   * Used for syncing posts and is also passed down to virt list for newMessages indicator
   */
  latestPostTimeStamp?: number;

  /*
   * Used for passing down to virt list so it can change the chunk of posts selected
   */
  changeUnreadChunkTimeStamp: (lastViewedAt: number) => void;

  /*
   * Used for skipping the call on load
   */
  isPrefetchingInProcess: boolean;

  isMobileView: boolean;

  lastViewedAt: number;

  toggleShouldStartFromBottomWhenUnread: () => void;
  shouldStartFromBottomWhenUnread: boolean;
  hasInaccessiblePosts: boolean;

  actions: {
    /*
     * Used for getting permalink view posts
     */
    loadPostsAround: (params: {
      channelId: string;
      focusedPostId: string;
    }) => Promise<ActionResult>;

    /*
     * Used for geting unreads posts
     */
    loadUnreads: (channelId: string) => Promise<ActionResult>;

    /*
     * Used for getting posts using BEFORE_ID and AFTER_ID
     */
    loadPosts: (
      parameters: LoadPostsParameters,
    ) => Promise<LoadPostsReturnValue>;

    /*
     * Used to loading posts since a timestamp to sync the posts
     */
    syncPostsInChannel: (params: {
      channelId: string;
      since: number;
    }) => Promise<ActionResult>;

    /*
     * Used to loading posts if it not first visit, permalink or there exists any postListIds
     * This happens when previous channel visit has a chunk which is not the latest set of posts
     */
    loadLatestPosts: (channelId: string) => Promise<ActionResult>;

    markChannelAsRead: (channelId: string) => void;
    updateNewMessagesAtInChannel: typeof updateNewMessagesAtInChannel;
  };
}

export const PostList: React.FC<Props> = ({
  formattedPostIds,
  postListIds,
  channelId,
  atLatestPost,
  atOldestPost,
  isFirstLoad,
  latestPostTimeStamp,
  changeUnreadChunkTimeStamp,
  isPrefetchingInProcess,
  isMobileView,
  lastViewedAt,
  toggleShouldStartFromBottomWhenUnread,
  shouldStartFromBottomWhenUnread,
  hasInaccessiblePosts,
  actions,
}) => {
  const [loadingOlderPosts, setLoadingOlderPosts] = useState(false);
  const [loadingNewerPosts, setLoadingNewerPosts] = useState(false);
  const [autoRetryEnable, setAutoRetryEnable] = useState(true);
  const autoRetriesCount = useRef(0);
  const extraPagesLoaded = useRef(0);
  const mounted = useRef(true);



  const postsOnLoad = useCallback(async () => {
    if (!channelId) return;
    
    if (isFirstLoad && !isPrefetchingInProcess) {
      await actions.loadUnreads(channelId);
      // Après loadUnreads, on a tout ce qu'il faut - pas besoin de sync
    } else if (latestPostTimeStamp && !isFirstLoad) {
      await actions.syncPostsInChannel({ channelId, since: latestPostTimeStamp });
    } else if (!isFirstLoad) {
      await actions.loadLatestPosts(channelId);
    }

    //actions.markChannelAsRead(channelId);

    if (mounted.current) {
      setLoadingOlderPosts(false);
      setLoadingNewerPosts(false);
    }
  }, [
    channelId, // Only re-run when channel changes
    isFirstLoad, // Or when first load status changes
    isPrefetchingInProcess, // Or when prefetch status changes
    actions, // Actions are stable
  ]);

  const callLoadPosts = async (postId: string, type: CanLoadMorePosts) => {
    const { error } = await actions.loadPosts({
      channelId,
      postId,
      type,
    });

    if (type === PostRequestTypes.BEFORE_ID) {
      setLoadingOlderPosts(false);
    } else {
      setLoadingNewerPosts(false);
    }

    if (error) {
      if (autoRetriesCount.current < MAX_NUMBER_OF_AUTO_RETRIES) {
        autoRetriesCount.current++;
        await callLoadPosts(postId, type);
      } else {
        setAutoRetryEnable(false);
      }
    } else {
      setAutoRetryEnable(true);
      autoRetriesCount.current = 0;
    }
  };

  const getOldestVisiblePostId = () => getOldestPostId(postListIds || []);
  const getLatestVisiblePostId = () => getLatestPostId(postListIds || []);

  const getPostsBefore = async () => {
    if (loadingOlderPosts) return;

    if (!autoRetryEnable) {
      extraPagesLoaded.current = 0;
    }

    const oldestPostId = getOldestVisiblePostId();
    setLoadingOlderPosts(true);
    await callLoadPosts(oldestPostId, PostRequestTypes.BEFORE_ID);
  };

  const getPostsAfter = async () => {
    if (loadingNewerPosts) return;

    if (!autoRetryEnable) {
      extraPagesLoaded.current = 0;
    }

    const latestPostId = getLatestVisiblePostId();
    setLoadingNewerPosts(true);
    await callLoadPosts(latestPostId, PostRequestTypes.AFTER_ID);
  };

  const canLoadMorePosts = async (
    type: CanLoadMorePosts = PostRequestTypes.BEFORE_ID,
  ) => {
    if (
      hasInaccessiblePosts ||
      !postListIds ||
      loadingOlderPosts ||
      loadingNewerPosts
    )
      return;

    if (extraPagesLoaded.current > MAX_EXTRA_PAGES_LOADED) {
      setAutoRetryEnable(false);
      return;
    }

    if (!atOldestPost && type === PostRequestTypes.BEFORE_ID) {
      await getPostsBefore();
    } else if (!atLatestPost) {
      await getPostsAfter();
    }

    extraPagesLoaded.current++;
  };

  useEffect(() => {
    mounted.current = true;
    if (channelId) {
      postsOnLoad();
    }
    return () => {
      mounted.current = false;
    };
  }, [channelId, postsOnLoad]);

  const actionsForPostList = {
    loadOlderPosts: getPostsBefore,
    loadNewerPosts: getPostsAfter,
    canLoadMorePosts,
    changeUnreadChunkTimeStamp,
    toggleShouldStartFromBottomWhenUnread,
    updateNewMessagesAtInChannel: actions.updateNewMessagesAtInChannel,
  };

  if (!postListIds) {
    return <LoadingScreen centered />;
  }

  return (
    <div className="post-list-holder-by-time" key={`postlist-${channelId}`}>
      <div className="post-list__table">
        <div id="virtualizedPostListContent" className="post-list__content">
          <PostListVirtualized
            loadingNewerPosts={loadingNewerPosts}
            loadingOlderPosts={loadingOlderPosts}
            atOldestPost={atOldestPost}
            atLatestPost={atLatestPost}
            channelId={channelId}
            autoRetryEnable={autoRetryEnable}
            shouldStartFromBottomWhenUnread={shouldStartFromBottomWhenUnread}
            actions={actionsForPostList}
            postListIds={formattedPostIds!}
            latestPostTimeStamp={latestPostTimeStamp}
            isMobileView={isMobileView}
            lastViewedAt={lastViewedAt}
          />
        </div>
      </div>
    </div>
  );
};

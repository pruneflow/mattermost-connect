import React, { useState, useEffect, useCallback } from "react";
import { Box } from "@mui/material";

import LoadingScreen from "../../common/LoadingScreen";

import { PostListContainer } from "./PostList";

type Props = {
  lastViewedAt?: number;
  channelId: string;
  unreadScrollPosition: string;
  channelLoading: boolean
};

interface State {
  unreadChunkTimeStamp?: number;
  loaderForChangeOfPostsChunk: boolean;
  channelLoading: boolean;
  shouldStartFromBottomWhenUnread: boolean;
}

export const PostView = ({
  lastViewedAt,
  channelId,
  unreadScrollPosition,
  channelLoading = true,
}: Props) => {
  const [unreadChunkTimeStamp, setUnreadChunkTimeStamp] = useState<number | undefined>(lastViewedAt);
  const [loaderForChangeOfPostsChunk, setLoaderForChangeOfPostsChunk] = useState(false);
  const [isChannelLoading, setChannelLoading] = useState(channelLoading);
  const [shouldStartFromBottomWhenUnread, setShouldStartFromBottomWhenUnread] = useState(
    unreadScrollPosition === "start_from_newest",
  );

  // 👉 Remplace getDerivedStateFromProps : synchronisation
  useEffect(() => {
    if (unreadChunkTimeStamp == null && lastViewedAt) {
      setUnreadChunkTimeStamp(lastViewedAt);
    }
  }, [lastViewedAt, unreadChunkTimeStamp]);

  useEffect(() => {
    if (channelLoading !== isChannelLoading) {
      setUnreadChunkTimeStamp(lastViewedAt);
      setChannelLoading(channelLoading);
    }
  }, [channelLoading, lastViewedAt, isChannelLoading]);

  const changeUnreadChunkTimeStamp = useCallback((newTimestamp: number) => {
    setUnreadChunkTimeStamp(newTimestamp);
    setLoaderForChangeOfPostsChunk(true);
    window.requestAnimationFrame(() => {
      setLoaderForChangeOfPostsChunk(false);
    });
  }, []);

  const toggleShouldStartFromBottomWhenUnread = useCallback(() => {
    setLoaderForChangeOfPostsChunk(true);
    setShouldStartFromBottomWhenUnread((prev) => !prev);
    window.requestAnimationFrame(() => {
      setLoaderForChangeOfPostsChunk(false);
    });
  }, []);

  if (channelLoading || loaderForChangeOfPostsChunk) {
    return (
      <Box
        id="post-list"
        sx={{
          width: "100%",
          height: "100%",
          position: "relative",
        }}
      >
        <LoadingScreen centered />
      </Box>
    );
  }

  return (
    <Box
      id="post-list"
      role="main"
      sx={{
        width: "100%",
        height: "100%",
        position: "relative",
      }}
    >
      <PostListContainer
        unreadChunkTimeStamp={unreadChunkTimeStamp}
        channelId={channelId}
        changeUnreadChunkTimeStamp={changeUnreadChunkTimeStamp}
        shouldStartFromBottomWhenUnread={shouldStartFromBottomWhenUnread}
        toggleShouldStartFromBottomWhenUnread={toggleShouldStartFromBottomWhenUnread}
      />
    </Box>
  );
};

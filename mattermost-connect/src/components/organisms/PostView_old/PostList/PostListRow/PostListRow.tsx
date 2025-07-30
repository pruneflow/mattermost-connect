import React from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { PostListRowListIds } from "../../../../../constants/posts";
import { DateDivider } from "../../../../atoms/DateDivider";
import { NewMessageSeparator } from "../../NewMessageSeparator";
import { StartOfChannelDivider } from "../../../../atoms/StartOfChannelDivider";
import { getDateForDateLine, isCombinedUserActivityPost, isDateLine, isStartOfNewMessages } from '../../../../../utils';
import { getPost } from "../../../../../store/selectors";
import { useAppSelector } from "../../../../../hooks";
import { CombinedMessage } from "../../../../molecules/CombinedMessage";
import { Message } from "../../../../molecules/Message";

export type PostListRowProps = {
  listId: string;
  previousListId?: string;
  fullWidth?: boolean;
  shouldHighlight?: boolean;
  loadOlderPosts: () => void;
  loadNewerPosts: () => void;
  togglePostMenu: (opened: boolean) => void;

  isLastPost: boolean;

  loadingNewerPosts: boolean;
  loadingOlderPosts: boolean;

  channelId: string;

};

export const PostListRow = (props: PostListRowProps) => {
  const {
    listId,
    previousListId,
    shouldHighlight,
    loadOlderPosts,
    loadNewerPosts,
    togglePostMenu,
    isLastPost,
    loadingOlderPosts,
    loadingNewerPosts,
  } = props;
  const post = useAppSelector(state => getPost(state, listId));
  const {
    OLDER_MESSAGES_LOADER,
    NEWER_MESSAGES_LOADER,
    CHANNEL_INTRO_MESSAGE,
    LOAD_OLDER_MESSAGES_TRIGGER,
    LOAD_NEWER_MESSAGES_TRIGGER,
  } = PostListRowListIds;

  if (isDateLine(listId)) {
    const date = getDateForDateLine(listId);

    return <DateDivider key={date} date={date} />;
  }

  if (isStartOfNewMessages(listId)) {
    return (
      <NewMessageSeparator />
    );
  }


  if (listId === CHANNEL_INTRO_MESSAGE) {
    return <StartOfChannelDivider />;
  }

  if (listId === LOAD_OLDER_MESSAGES_TRIGGER || listId === LOAD_NEWER_MESSAGES_TRIGGER) {
    return (
      <Button
        variant="text"
        sx={{color: 'primary.main', textTransform: 'none'}}
        onClick={listId === LOAD_OLDER_MESSAGES_TRIGGER ? loadOlderPosts : loadNewerPosts}
      >
        Load More Messages
      </Button>
    );
  }

  const isOlderMessagesLoader = listId === OLDER_MESSAGES_LOADER;
  const isNewerMessagesLoader = listId === NEWER_MESSAGES_LOADER;

  if (isOlderMessagesLoader || isNewerMessagesLoader) {
    const shouldHideAnimation = !loadingOlderPosts && !loadingNewerPosts;

    return (
      <Box
        sx={{
          display: shouldHideAnimation ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 2,
        }}
        className="loading-screen"
      >
        <Box
          sx={{
            display: 'flex',
            gap: 1,
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'primary.main',
            }}
          />
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'primary.main',
            }}
          />
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'primary.main',
            }}
          />
        </Box>
      </Box>
    );
  }

  const postProps = {
    previousPostId: previousListId,
    shouldHighlight: Boolean(shouldHighlight),
    togglePostMenu,
    isLastPost,
  };
  if (isCombinedUserActivityPost(listId)) {
    return (
      <CombinedMessage
        combinedId={listId}
        {...postProps}
      />
    );
  }

  return (
    <Message
      post={post}
      {...postProps}
    />
  );
}

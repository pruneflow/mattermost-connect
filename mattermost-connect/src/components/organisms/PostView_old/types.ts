// PostView component types
export interface PostViewProps {
  lastViewedAt?: number;
  channelId: string;
  unreadScrollPosition: string;
  channelLoading: boolean;
}

export interface PostViewState {
  unreadChunkTimeStamp?: number;
  loaderForChangeOfPostsChunk: boolean;
  channelLoading: boolean;
  shouldStartFromBottomWhenUnread: boolean;
}
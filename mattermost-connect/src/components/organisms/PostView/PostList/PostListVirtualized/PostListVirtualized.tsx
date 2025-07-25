import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
} from "react";
import AutoSizer from "react-virtualized-auto-sizer";

import {
  getNewMessagesIndex,
  isDateLine,
  isStartOfNewMessages,
} from "../../../../../utils/postUtils";

import { updateNewMessagesAtInChannel } from "../../../../../store";
import { CanLoadMorePosts, PostRequestTypes } from "../../../../../api/types";

import { DynamicSizeList, DynamicSizeListRef } from "dynamic-virtualized-list";

import { PostListRow } from "../PostListRow";
import ScrollToBottomArrows from "../../ScrollToBottomArrows";

import ToastWrapper from "../../ToastWrapper";

import {
  DelayedAction,
  getPreviousPostId,
  getLatestPostId,
} from "../../../../../utils";

import { LatestPostReader } from "./LatestPostReader";
import { PostListRowListIds } from "../../../../../constants/posts";

const OVERSCAN_COUNT_BACKWARD = 80;
const OVERSCAN_COUNT_FORWARD = 80;
const HEIGHT_TRIGGER_FOR_MORE_POSTS = 1000;
const BUFFER_TO_BE_CONSIDERED_BOTTOM = 10;

const MAXIMUM_POSTS_FOR_SLICING = {
  channel: 50,
  permalink: 100,
};

const postListStyle = {
  padding: "14px 0px 7px",
};

const virtListStyles = {
  position: "absolute",
  bottom: "0",
  maxHeight: "100%",
} as const;

const OFFSET_TO_SHOW_TOAST = -50;

type Props = {
  postListIds?: string[];
  channelId: string;
  autoRetryEnable: boolean;
  loadingNewerPosts: boolean;
  loadingOlderPosts: boolean;
  isMobileView: boolean;
  atOldestPost?: boolean;
  atLatestPost?: boolean;
  latestPostTimeStamp?: number;
  lastViewedAt: number;
  shouldStartFromBottomWhenUnread: boolean;
  actions: {
    loadOlderPosts: () => Promise<void>;
    loadNewerPosts: () => Promise<void>;
    canLoadMorePosts: (type: CanLoadMorePosts) => Promise<void>;
    changeUnreadChunkTimeStamp: (lastViewedAt: number) => void;
    updateNewMessagesAtInChannel: typeof updateNewMessagesAtInChannel;
    toggleShouldStartFromBottomWhenUnread: () => void;
  };
};

type State = {
  isScrolling: boolean;
  atBottom: boolean | null;
  lastViewedBottom: number;
  postListIds: string[];
  topPostId: string;
  postMenuOpened: boolean;
  dynamicListStyle: {
    willChange: string;
  };
  initScrollCompleted: boolean;
  initScrollOffsetFromBottom: number;
  showSearchHint: boolean;
  isSearchHintDismissed: boolean;
  isMobileView?: boolean;
  isNewMessageLineReached: boolean;
  showScrollToBottomToast: boolean;
  isScrollToBottomDismissed: boolean;
};

// Hook personnalisé pour remplacer getSnapshotBeforeUpdate
const useScrollSnapshot = (
  postListRef: React.RefObject<HTMLDivElement>,
  postListIds: string[],
  prevPostListIds: string[],
  atOldestPost: boolean,
  prevAtOldestPost: boolean,
  atBottom: boolean | null,
) => {
  const snapshotRef = useRef<{
    previousScrollTop: number;
    previousScrollHeight: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (postListRef.current) {
      const postsAddedAtTop =
        postListIds.length !== prevPostListIds.length &&
        postListIds[0] === prevPostListIds[0];
      const channelHeaderAdded = atOldestPost !== prevAtOldestPost;

      if ((postsAddedAtTop || channelHeaderAdded) && atBottom === false) {
        const postListNode = postListRef.current;
        const previousScrollTop = postListNode.parentElement?.scrollTop || 0;
        const previousScrollHeight = postListNode.scrollHeight;

        snapshotRef.current = {
          previousScrollTop,
          previousScrollHeight,
        };
      } else {
        snapshotRef.current = null;
      }
    }
  });

  return snapshotRef.current;
};

export const PostListVirtualized: React.FC<Props> = (props) => {
  const {
    postListIds: propsPostListIds = [],
    channelId,
    autoRetryEnable,
    loadingNewerPosts,
    loadingOlderPosts,
    isMobileView,
    atOldestPost,
    atLatestPost,
    latestPostTimeStamp,
    lastViewedAt,
    shouldStartFromBottomWhenUnread,
    actions,
  } = props;


  // State global
  const [state, setState] = useState<State>(() => {
    const channelIntroMessage = PostListRowListIds.CHANNEL_INTRO_MESSAGE;
    return {
      isScrolling: false,
      atBottom: null,
      lastViewedBottom: Date.now(),
      postListIds: [channelIntroMessage],
      topPostId: "",
      postMenuOpened: false,
      dynamicListStyle: {
        willChange: "transform",
      },
      initScrollCompleted: false,
      initScrollOffsetFromBottom: 0,
      showSearchHint: false,
      isSearchHintDismissed: false,
      isMobileView,
      isNewMessageLineReached: false,
      showScrollToBottomToast: false,
      isScrollToBottomDismissed: false,
    };
  });

  // Refs
  const listRef = useRef<DynamicSizeListRef>(null);
  const postListRef = useRef<HTMLDivElement>(null);
  const scrollStopActionRef = useRef<DelayedAction | null>(null);
  const mountedRef = useRef(true);
  const newMessageLineIndexRef = useRef(0);
  const showSearchHintThresholdRef = useRef(0);
  const initRangeToRenderRef = useRef<number[]>([
    0,
    MAXIMUM_POSTS_FOR_SLICING.channel,
  ]);
  const prevPostListIdsRef = useRef<string[]>([]);
  const prevAtOldestPostRef = useRef<boolean | undefined>(undefined);

  // Calcul des postListIds dérivés
  const derivedPostListIds = useMemo(() => {
    const postListIds = propsPostListIds || [];
    let newPostListIds;

    if (atOldestPost) {
      newPostListIds = [
        ...postListIds,
        PostListRowListIds.CHANNEL_INTRO_MESSAGE,
      ];
    } else if (autoRetryEnable) {
      newPostListIds = [
        ...postListIds,
        PostListRowListIds.OLDER_MESSAGES_LOADER,
      ];
    } else {
      newPostListIds = [
        ...postListIds,
        PostListRowListIds.LOAD_OLDER_MESSAGES_TRIGGER,
      ];
    }

    if (!atLatestPost) {
      if (autoRetryEnable) {
        newPostListIds = [
          PostListRowListIds.NEWER_MESSAGES_LOADER,
          ...newPostListIds,
        ];
      } else {
        newPostListIds = [
          PostListRowListIds.LOAD_NEWER_MESSAGES_TRIGGER,
          ...newPostListIds,
        ];
      }
    }

    return newPostListIds;
  }, [propsPostListIds, atOldestPost, atLatestPost, autoRetryEnable]);

  // Hook pour gérer le snapshot du scroll
  const snapshot = useScrollSnapshot(
    postListRef,
    derivedPostListIds,
    prevPostListIdsRef.current,
    atOldestPost || false,
    prevAtOldestPostRef.current || false,
    state.atBottom,
  );

  // Initialisation des valeurs
  useEffect(() => {
    mountedRef.current = true;

    // Initialisation du newMessageLineIndex
    newMessageLineIndexRef.current = getNewMessagesIndex(
      propsPostListIds || [],
    );

    // Initialisation du showSearchHintThreshold
    showSearchHintThresholdRef.current = window.screen.height * 3;

    // Initialisation de initRangeToRender
    const postIndex = getNewMessagesIndex(propsPostListIds || []);
    const maxPostsForSlicing = MAXIMUM_POSTS_FOR_SLICING.channel;
    initRangeToRenderRef.current = [
      Math.max(postIndex - 30, 0),
      Math.max(
        postIndex + 30,
        Math.min((propsPostListIds || []).length - 1, maxPostsForSlicing),
      ),
    ];

    if (isMobileView) {
      scrollStopActionRef.current = new DelayedAction(handleScrollStop);
    }

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Mise à jour des états dérivés
  useLayoutEffect(() => {
    setState((prevState) => {
      const updates: Partial<State> = {
        postListIds: derivedPostListIds,
      };

      if (isMobileView !== prevState.isMobileView) {
        updates.isMobileView = isMobileView;

        const dynamicListStyle = prevState.dynamicListStyle;
        if (prevState.postMenuOpened) {
          if (!isMobileView && dynamicListStyle.willChange === "unset") {
            updates.dynamicListStyle = {
              ...dynamicListStyle,
              willChange: "transform",
            };
          } else if (
            isMobileView &&
            dynamicListStyle.willChange === "transform"
          ) {
            updates.dynamicListStyle = {
              ...dynamicListStyle,
              willChange: "unset",
            };
          }
        }
      }

      return { ...prevState, ...updates };
    });
  }, [derivedPostListIds, isMobileView]);

  // Gestion du scroll snapshot
  useLayoutEffect(() => {
    if (snapshot && postListRef.current && !state.atBottom) {
      const postlistScrollHeight = postListRef.current.scrollHeight;
      const scrollValue =
        snapshot.previousScrollTop +
        (postlistScrollHeight - snapshot.previousScrollHeight);

      if (scrollValue !== 0 && scrollValue - snapshot.previousScrollTop !== 0) {
        listRef.current?.scrollTo(
          scrollValue,
          scrollValue - snapshot.previousScrollTop,
          true,
        );
      }
    }
  });

  // Mise à jour des refs pour les comparaisons
  useLayoutEffect(() => {
    prevPostListIdsRef.current = derivedPostListIds;
    prevAtOldestPostRef.current = atOldestPost;
  });

  // Mise à jour du newMessageLineIndex
  useLayoutEffect(() => {
    newMessageLineIndexRef.current = getNewMessagesIndex(
      propsPostListIds || [],
    );
  }, [propsPostListIds]);

  // Gestion des event listeners
  useEffect(() => {
    const handleWindowResize = () => {
      showSearchHintThresholdRef.current = window.screen.height * 3;
    };

    const scrollToLatestMessages = () => {
      if (atLatestPost) {
        scrollToBottom();
      } else {
        updateNewMessagesAtInChannel();
        actions.changeUnreadChunkTimeStamp(0);
      }
    };

    window.addEventListener("resize", handleWindowResize);
    // EventEmitter.addListener(EventTypes.POST_LIST_SCROLL_TO_BOTTOM, scrollToLatestMessages);

    return () => {
      window.removeEventListener("resize", handleWindowResize);
      // EventEmitter.removeListener(EventTypes.POST_LIST_SCROLL_TO_BOTTOM, scrollToLatestMessages);
    };
  }, [atLatestPost, actions]);

  // Gestion du DelayedAction pour mobile
  useEffect(() => {
    if (isMobileView && !scrollStopActionRef.current) {
      scrollStopActionRef.current = new DelayedAction(handleScrollStop);
    } else if (!isMobileView && scrollStopActionRef.current) {
      scrollStopActionRef.current = null;
    }
  }, [isMobileView]);

  // Méthodes
  const handleScrollStop = useCallback(() => {
    if (mountedRef.current) {
      setState((prev) => ({ ...prev, isScrolling: false }));
    }
  }, []);

  const togglePostMenu = useCallback(
    (opened: boolean) => {
      setState((prev) => {
        let dynamicListStyle = prev.dynamicListStyle;
        if (isMobileView) {
          dynamicListStyle = {
            ...dynamicListStyle,
            willChange: opened ? "unset" : "transform",
          };
        }

        return {
          ...prev,
          postMenuOpened: opened,
          dynamicListStyle,
        };
      });
    },
    [isMobileView],
  );

  const onNewMessageLineReached = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isNewMessageLineReached: true,
    }));
  }, []);

  const getOffsetFromBottom = useCallback(
    (scrollOffset: number, scrollHeight: number, clientHeight: number) =>
      scrollHeight - clientHeight - scrollOffset,
    [],
  );

  const isAtBottom = useCallback(
    (scrollOffset: number, scrollHeight: number, clientHeight: number) => {
      const offsetFromBottom = getOffsetFromBottom(
        scrollOffset,
        scrollHeight,
        clientHeight,
      );
      return (
        offsetFromBottom <= BUFFER_TO_BE_CONSIDERED_BOTTOM && scrollHeight > 0
      );
    },
    [getOffsetFromBottom],
  );

  const updateAtBottom = useCallback(
    (atBottom: boolean) => {
      setState((prev) => {
        if (atBottom !== prev.atBottom) {
          let lastViewedBottom = Date.now();
          if (latestPostTimeStamp && latestPostTimeStamp > lastViewedBottom) {
            lastViewedBottom = latestPostTimeStamp;
          }

          return {
            ...prev,
            atBottom,
            lastViewedBottom,
          };
        }
        return prev;
      });
    },
    [latestPostTimeStamp],
  );

  const checkBottom = useCallback(
    (scrollOffset: number, scrollHeight: number, clientHeight: number) => {
      updateAtBottom(isAtBottom(scrollOffset, scrollHeight, clientHeight));
    },
    [updateAtBottom, isAtBottom],
  );

  const updateScrollToBottomToastVisibility = useCallback(
    (scrollOffset: number, scrollHeight: number, clientHeight: number) => {
      setState((prev) => {
        if (prev.showScrollToBottomToast && prev.atBottom) {
          return { ...prev, showScrollToBottomToast: false };
        }

        if (!prev.isScrollToBottomDismissed) {
          const offsetFromBottom = getOffsetFromBottom(
            scrollOffset,
            scrollHeight,
            clientHeight,
          );
          return {
            ...prev,
            showScrollToBottomToast:
              offsetFromBottom > showSearchHintThresholdRef.current,
          };
        }

        return prev;
      });
    },
    [getOffsetFromBottom],
  );

  const onScroll = useCallback(
    ({
      scrollDirection,
      scrollOffset,
      scrollUpdateWasRequested,
      clientHeight,
      scrollHeight,
    }: {
      scrollDirection: string;
      scrollOffset: number;
      scrollUpdateWasRequested: boolean;
      clientHeight: number;
      scrollHeight: number;
    }) => {
      if (scrollHeight <= 0) {
        return;
      }

      const didUserScrollBackwards =
        scrollDirection === "backward" && !scrollUpdateWasRequested;
      const didUserScrollForwards =
        scrollDirection === "forward" && !scrollUpdateWasRequested;
      const isOffsetWithInRange = scrollOffset < HEIGHT_TRIGGER_FOR_MORE_POSTS;
      const offsetFromBottom = getOffsetFromBottom(
        scrollOffset,
        scrollHeight,
        clientHeight,
      );
      const shouldLoadNewPosts =
        offsetFromBottom < HEIGHT_TRIGGER_FOR_MORE_POSTS;

      if (didUserScrollBackwards && isOffsetWithInRange && !atOldestPost) {
        actions.loadOlderPosts();
      } else if (didUserScrollForwards && shouldLoadNewPosts && !atLatestPost) {
        actions.loadNewerPosts();
      }

      if (isMobileView) {
        setState((prev) => ({ ...prev, isScrolling: true }));

        if (scrollStopActionRef.current) {
          scrollStopActionRef.current.fireAfter(2000);
        }
      }

      checkBottom(scrollOffset, scrollHeight, clientHeight);

      if (scrollUpdateWasRequested) {
        const postsRenderedRange = listRef.current?._getRangeToRender?.();

        if (postsRenderedRange && postsRenderedRange[3] <= 1 && !atLatestPost) {
          actions.canLoadMorePosts(PostRequestTypes.AFTER_ID);
        }

        if (!state.atBottom && scrollHeight) {
          setState((prev) => ({
            ...prev,
            initScrollOffsetFromBottom: offsetFromBottom,
          }));
        }
      }

      if (isMobileView && state.showSearchHint) {
        setState((prev) => ({ ...prev, showSearchHint: false }));
      }

      if (!isMobileView && !state.isSearchHintDismissed) {
        setState((prev) => ({
          ...prev,
          showSearchHint: offsetFromBottom > showSearchHintThresholdRef.current,
        }));
      }

      updateScrollToBottomToastVisibility(
        scrollOffset,
        scrollHeight,
        clientHeight,
      );
    },
    [
      actions,
      atOldestPost,
      atLatestPost,
      isMobileView,
      state.atBottom,
      state.showSearchHint,
      state.isSearchHintDismissed,
      getOffsetFromBottom,
      checkBottom,
      updateScrollToBottomToastVisibility,
    ],
  );

  const scrollToFailed = useCallback(
    (index: number) => {
      if (index === 0) {
        actions.changeUnreadChunkTimeStamp(0);
      } else {
        actions.changeUnreadChunkTimeStamp(lastViewedAt);
      }
    },
    [actions, lastViewedAt],
  );

  const updateFloatingTimestamp = useCallback(
    (visibleTopItem: number) => {
      if (!isMobileView || !propsPostListIds) {
        return;
      }

      setState((prev) => ({
        ...prev,
        topPostId: getLatestPostId(propsPostListIds.slice(visibleTopItem)),
      }));
    },
    [isMobileView, propsPostListIds],
  );

  const onItemsRendered = useCallback(
    ({
      visibleStartIndex,
      visibleStopIndex,
    }: {
      visibleStartIndex: number;
      visibleStopIndex: number;
    }) => {
      updateFloatingTimestamp(visibleStartIndex);

      if (
        newMessageLineIndexRef.current > 0 &&
        !state.isNewMessageLineReached &&
        newMessageLineIndexRef.current <= visibleStartIndex &&
        newMessageLineIndexRef.current >= visibleStopIndex
      ) {
        onNewMessageLineReached();
      }
    },
    [
      updateFloatingTimestamp,
      state.isNewMessageLineReached,
      onNewMessageLineReached,
    ],
  );

  const initScrollToIndex = useCallback(() => {
    if (shouldStartFromBottomWhenUnread) {
      return {
        index: 0,
        position: "end" as const,
      };
    }

    const newMessagesSeparatorIndex = getNewMessagesIndex(state.postListIds);

    if (newMessagesSeparatorIndex > 0) {
      if (isDateLine(state.postListIds[newMessagesSeparatorIndex + 1])) {
        return {
          index: newMessagesSeparatorIndex + 1,
          position: "start" as const,
          offset: OFFSET_TO_SHOW_TOAST,
        };
      }
      return {
        index: newMessagesSeparatorIndex,
        position: "start" as const,
        offset: OFFSET_TO_SHOW_TOAST,
      };
    }

    return {
      index: 0,
      position: "end" as const,
    };
  }, [shouldStartFromBottomWhenUnread, state.postListIds]);

  const scrollToLatestMessages = useCallback(() => {
    if (atLatestPost) {
      scrollToBottom();
    } else {
      updateNewMessagesAtInChannel();
      actions.changeUnreadChunkTimeStamp(0);
    }
  }, [atLatestPost, actions]);

  const scrollToUnreadMessages = useCallback(() => {
    actions.toggleShouldStartFromBottomWhenUnread();
  }, [actions]);

  const scrollToBottom = useCallback(() => {
    listRef.current?.scrollToItem(0, "end");
  }, []);

  const scrollToNewMessage = useCallback(() => {
    listRef.current?.scrollToItem(
      getNewMessagesIndex(state.postListIds),
      "start",
      OFFSET_TO_SHOW_TOAST,
    );
  }, [state.postListIds]);

  const updateNewMessagesAtInChannel = useCallback(
    (lastViewedAt = Date.now()) => {
      actions.updateNewMessagesAtInChannel({ channelId, lastViewedAt });
    },
    [actions, channelId],
  );

  const updateLastViewedBottomAt = useCallback(
    (lastViewedBottom = Date.now()) => {
      setState((prev) => ({ ...prev, lastViewedBottom }));
    },
    [],
  );

  const handleSearchHintDismiss = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showSearchHint: false,
      isSearchHintDismissed: true,
    }));
  }, []);

  const handleScrollToBottomToastDismiss = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showScrollToBottomToast: false,
      isScrollToBottomDismissed: true,
    }));
  }, []);

  const hideScrollToBottomToast = useCallback(() => {
    setState((prev) => ({ ...prev, showScrollToBottomToast: false }));
  }, []);
  const renderRow = useCallback(
    ({
      data,
      itemId,
      style,
    }: {
      data: string[];
      itemId: string;
      style: React.CSSProperties;
    }) => {
      const index = data.indexOf(itemId);
      let className = "";
      const basePaddingClass = "post-row__padding";
      const previousItemId =
        index !== -1 && index < data.length - 1 ? data[index + 1] : "";
      const nextItemId =
        index > 0 && index < data.length ? data[index - 1] : "";

      if (isDateLine(nextItemId) || isStartOfNewMessages(nextItemId)) {
        className += basePaddingClass + " bottom";
      }

      if (isDateLine(previousItemId) || isStartOfNewMessages(previousItemId)) {
        if (className.includes(basePaddingClass)) {
          className += " top";
        } else {
          className += basePaddingClass + " top";
        }
      }

      const isLastPost = itemId === state.postListIds[0];

      return (
        <div style={style} className={className}>
          <PostListRow
            listId={itemId}
            previousListId={getPreviousPostId(data, index)}
            loadOlderPosts={actions.loadOlderPosts}
            loadNewerPosts={actions.loadNewerPosts}
            togglePostMenu={togglePostMenu}
            isLastPost={isLastPost}
            loadingNewerPosts={loadingNewerPosts}
            loadingOlderPosts={loadingOlderPosts}
            channelId={channelId}
          />
        </div>
      );
    },
    [
      state.postListIds,
      actions,
      togglePostMenu,
      loadingNewerPosts,
      loadingOlderPosts,
      channelId,
    ],
  );

  const renderToasts = useCallback(
    () => {
      return (
        <ToastWrapper
          channelId={channelId}
          atLatestPost={atLatestPost}
          atBottom={state.atBottom || false}
        />
      );
    },
    [
      atLatestPost,
      state.atBottom,
      channelId,
    ],
  );


  return (
    <div
      className="a11y__region"
      data-a11y-sort-order="1"
      data-a11y-focus-child={true}
      data-a11y-order-reversed={true}
      data-a11y-loop-navigation={false}
      aria-label="message list main region"
    >
      {isMobileView && (
        <>
          <ScrollToBottomArrows
            isScrolling={state.isScrolling}
            atBottom={Boolean(state.atBottom)}
            onClick={scrollToBottom}
          />
        </>
      )}
      <div className="post-list-holder-by-time" key={"postlist-" + channelId}>
        <div className="post-list__table">
          <div id="postListContent" className="post-list__content" style={{ height: '400px' }}>
            {/* TODO: See Mattermost to use it properly */}
            {/* <LatestPostReader postIds={propsPostListIds} /> */}
            <AutoSizer>
              {({ height, width }) => {
                return (
                  <>
                    <div>{renderToasts()}</div>
                    <DynamicSizeList
                      ref={listRef}
                      id="postListScrollContainer"
                      className="post-list__dynamic"
                      height={height}
                      width={width}
                      itemData={state.postListIds}
                      overscanCountForward={OVERSCAN_COUNT_FORWARD}
                      overscanCountBackward={OVERSCAN_COUNT_BACKWARD}
                      onScroll={onScroll}
                      initScrollToIndex={initScrollToIndex}
                      canLoadMorePosts={actions.canLoadMorePosts}
                      innerRef={postListRef}
                      style={{ ...virtListStyles, ...state.dynamicListStyle }}
                      innerListStyle={postListStyle}
                      initRangeToRender={initRangeToRenderRef.current as [number, number]}
                      loaderId={PostListRowListIds.OLDER_MESSAGES_LOADER}
                      correctScrollToBottom={atLatestPost}
                      onItemsRendered={onItemsRendered}
                      scrollToFailed={scrollToFailed}
                    >
                      {renderRow}
                    </DynamicSizeList>
                  </>
                );
              }}
            </AutoSizer>
          </div>
        </div>
      </div>
    </div>
  );
};

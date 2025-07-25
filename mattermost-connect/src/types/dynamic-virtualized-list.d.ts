declare module 'dynamic-virtualized-list' {
  import { MutableRefObject, CSSProperties, ReactElement } from 'react';

  interface ScrollEvent {
    scrollDirection: string;
    scrollOffset: number;
    scrollUpdateWasRequested: boolean;
    clientHeight: number;
    scrollHeight: number;
  }

  interface RenderItemProps {
    index: number;
    style: CSSProperties;
    data: any[];
    itemId: string;
    className?: string;
  }

  interface DynamicSizeListProps {
    // OBLIGATOIRES
    height: number;
    width: string | number;
    itemData: any[];
    children: (props: RenderItemProps) => ReactElement;

    // OPTIONNELS avec valeurs par défaut
    overscanCountForward?: number; // 30 par défaut, Mattermost utilise 80
    overscanCountBackward?: number; // 10 par défaut, Mattermost utilise 80
    innerTagName?: string; // 'div' par défaut
    outerTagName?: string; // 'div' par défaut

    // CALLBACKS IMPORTANTS
    canLoadMorePosts?: (type : any) => void; // CRUCIAL pour auto-load
    onScroll?: (event: ScrollEvent) => void;
    onItemsRendered?: (info: {
      overscanStartIndex: number;
      overscanStopIndex: number;
      visibleStartIndex: number;
      visibleStopIndex: number;
    }) => void;
    scrollToFailed?: (index: number) => void;

    // STYLING ET RÉFÉRENCES
    style?: CSSProperties;
    innerListStyle?: CSSProperties;
    innerRef?: MutableRefObject<HTMLDivElement | null>;
    outerRef?: MutableRefObject<HTMLDivElement | null>;

    // SCROLL MANAGEMENT - EXACT Mattermost
    initialScrollOffset?: number;
    initRangeToRender?: [number, number];
    correctScrollToBottom?: boolean;
    initScrollToIndex?: () => { index: number; position: string; offset?: number }; // ← CRITIQUE MANQUANT

    // IDENTIFICATION
    id?: string;
    className?: string;
    loaderId?: string;
    visibleId?: string;
  }

  interface DynamicSizeListRef {
    scrollToItem: (index: number, align?: 'start' | 'center' | 'end' | 'auto', offset?: number) => void;
    scrollTo: (scrollOffset: number, scrollByValue?: number, useAnimationFrame?: boolean) => void;
    getItemOffset: (index: number) => number;
    getItemSize: (index: number) => number;
    _getRangeToRender: () => number[];
    resetAfterIndex: (index: number) => void;
  }

  // Functional component, not class
  const DynamicSizeList: React.ForwardRefExoticComponent<DynamicSizeListProps & React.RefAttributes<DynamicSizeListRef>>;

  export { DynamicSizeList, DynamicSizeListRef };
}
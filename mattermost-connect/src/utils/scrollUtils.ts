const BOTTOM_THRESHOLD = 10; // pixels from bottom to consider "at bottom"

export const scrollToBottom = (element: HTMLDivElement | null): void => {
  if (!element) return;
  
  element.scrollTo({
    top: element.scrollHeight,
    behavior: 'smooth',
  });
};

export const isAtBottom = (element: HTMLDivElement | null): boolean => {
  if (!element) return false;
  
  const { scrollTop, scrollHeight, clientHeight } = element;
  return scrollHeight - scrollTop - clientHeight <= BOTTOM_THRESHOLD;
};
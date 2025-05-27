import { useSelector, TypedUseSelectorHook } from 'react-redux';
import { store } from '../store';

// Export the RootState type for external usage
export type RootState = ReturnType<typeof store.getState>;

// Typed version of useSelector hook
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
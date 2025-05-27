import { useDispatch } from 'react-redux';
import { store } from '../store';

// Export the AppDispatch type for external usage
export type AppDispatch = typeof store.dispatch;

// Typed version of useDispatch hook
export const useAppDispatch = () => useDispatch<AppDispatch>();
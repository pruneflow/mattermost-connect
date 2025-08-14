/**
 * Typed useDispatch hook for the app store
 * Provides type-safe access to the Redux dispatch function
 */
import { useDispatch } from 'react-redux';
import { store } from '../store';

// Export the AppDispatch type for external usage
export type AppDispatch = typeof store.dispatch;

// Typed version of useDispatch hook - stable reference
export const useAppDispatch: () => AppDispatch = useDispatch;
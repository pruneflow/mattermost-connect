// src/hooks/index.ts
/**
 * Exporte tous les hooks spécialisés de la bibliothèque
 * Pour faciliter les imports et assurer la cohérence
 */

// Hooks spécifiques par domaine
export { useAuth } from "./useAuth";
export type { AuthResult } from "./useAuth";
export { useChannel } from "./useChannel";
export { useTeam } from "./useTeam";
export { useUser, useUsers } from "./useUser";
export { useFile } from "./useFile";
export type { FileInfo, UploadingFile } from "./useFile";
export { useRealtime } from "./useRealtime";
export { useAuthRetry } from "./useAuthRetry";

// Hook principal intégré
export { useMattermostConnect } from "./useMattermostConnect";

// src/core/store/storeConfig.ts
import { enableMapSet } from "immer";

// Enable immer's MapSet extension
enableMapSet();

// Export other configurations if needed
export const storeConfig = {
  initialized: true,
};

export default storeConfig;

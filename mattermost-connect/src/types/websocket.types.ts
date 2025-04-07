/**
 * WebSocket connection interface
 */
export interface WebSocketConnection {
  /** Close the WebSocket connection */
  close: () => void;

  /** Send a message to the WebSocket server */
  send: (message: unknown) => void;

  /** Get the current connection state */
  getState: () => number;
}

/**
 * WebSocket setup options
 */
export interface WebSocketSetupOptions {
  /** Connection mode ('direct' or 'proxy') */
  mode: "direct" | "proxy" | "custom";

  /** Server URL (WebSocket endpoint) */
  serverUrl: string;

  /** Authentication token */
  token: string;

  /** Callback for incoming messages */
  onMessage?: (message: any) => void;

  /** Callback for connection errors */
  onError?: (error: Event) => void;

  /** Callback for connection close */
  onClose?: (event: CloseEvent) => void;
}

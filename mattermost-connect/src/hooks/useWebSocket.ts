import { useCallback, useEffect, useRef } from 'react';
import { useAppSelector } from './useAppSelector';
import { selectWebSocketConnectionStatus } from "../store/selectors";
import { useAppDispatch } from './useAppDispatch';
import { setConnectionStatus, setConnectionError } from '../store/slices/websocketSlice';
import { useUnreadCounts } from './useUnreadCounts';
import { useChannelWebSocket } from './useChannelWebSocket';
import { useTeamWebSocket } from './useTeamWebSocket';
import { useTypingWebSocket } from './useTypingWebSocket';
import { WebSocketClient } from '@mattermost/client';

interface UseWebSocketReturn {
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  connect: (serverUrl: string, token: string) => void;
  disconnect: () => void;
  reconnect: () => void;
}

export const useWebSocket = (): UseWebSocketReturn => {
  const dispatch = useAppDispatch();
  const wsClientRef = useRef<any>(null);
  const serverUrlRef = useRef<string>('');
  const tokenRef = useRef<string>('');
  
  const connectionStatus = useAppSelector(selectWebSocketConnectionStatus);
  const { handleWebSocketEvent: handleUnreadEvent } = useUnreadCounts();
  const { handleChannelEvent } = useChannelWebSocket();
  const { handleTeamEvent } = useTeamWebSocket();
  const { handleTypingEvent } = useTypingWebSocket();

  const connect = useCallback((serverUrl: string, token: string) => {
    if (wsClientRef.current) {
      wsClientRef.current.close();
    }

    serverUrlRef.current = serverUrl;
    tokenRef.current = token;
    
    dispatch(setConnectionStatus('connecting'));

    // Use official @mattermost/client WebSocketClient
    const wsClient = new WebSocketClient();
    wsClientRef.current = wsClient;

    // Convert HTTP to WebSocket URL
    const wsProtocol = serverUrl.startsWith("https") ? "wss" : "ws";
    const baseUrl = serverUrl.replace(/^https?:\/\//, "");
    const wsUrl = `${wsProtocol}://${baseUrl}/api/v4/websocket`;

    console.log('WebSocket: Connecting to:', wsUrl);
    // Set up event handlers using new API (non-deprecated)
    wsClient.addMessageListener((msg: any) => {
      console.log('WebSocket message received:', msg);
      if (msg.event && msg.data) {
        // Route events to appropriate handlers
        handleTypingEvent(msg);
        handleUnreadEvent(msg.event, msg.data);
        handleChannelEvent(msg.event, msg.data);
        handleTeamEvent(msg.event, msg.data);
      }
    });

    wsClient.addFirstConnectListener(() => {
      console.log('WebSocket: First connection established');
      dispatch(setConnectionStatus('connected'));
    });
    wsClient.addReconnectListener(() => {
      console.log('WebSocket: Reconnection established');
      dispatch(setConnectionStatus('connected'));
    });

    wsClient.addCloseListener(() => {
      console.log('WebSocket: Connection closed');
      dispatch(setConnectionStatus('disconnected'));
    });

    wsClient.addErrorListener((error: any) => {
      console.error('WebSocket: Error', error);
      dispatch(setConnectionError('WebSocket connection error'));
    });

    // Connect with token
    wsClient.initialize(wsUrl, token);
  }, [handleUnreadEvent, handleChannelEvent, handleTeamEvent, handleTypingEvent, dispatch]);

  const disconnect = useCallback(() => {
    if (wsClientRef.current) {
      wsClientRef.current.close();
      wsClientRef.current = null;
    }
    dispatch(setConnectionStatus('disconnected'));
  }, [dispatch]);

  const reconnect = useCallback(() => {
    if (serverUrlRef.current && tokenRef.current) {
      connect(serverUrlRef.current, tokenRef.current);
    }
  }, [connect]);

  useEffect(() => {
    return () => {
      if (wsClientRef.current) {
        wsClientRef.current.close();
      }
    };
  }, []);

  return {
    connectionStatus,
    connect,
    disconnect,
    reconnect,
  };
};

export default useWebSocket;
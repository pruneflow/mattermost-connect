import { useCallback, useEffect, useRef } from 'react';
import { WebSocketClient } from '@mattermost/client';
import { useAppSelector } from './useAppSelector';
import { useAppDispatch } from './useAppDispatch';
import { setConnectionStatus, setConnectionError } from '../store/slices/websocketSlice';
import { useUnreadCounts } from './useUnreadCounts';

interface UseWebSocketReturn {
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  connect: (serverUrl: string, token: string) => void;
  disconnect: () => void;
  reconnect: () => void;
}

export const useWebSocket = (): UseWebSocketReturn => {
  const dispatch = useAppDispatch();
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const serverUrlRef = useRef<string>('');
  const tokenRef = useRef<string>('');
  
  const connectionStatus = useAppSelector(state => state.websocket.status);
  const { handleWebSocketEvent } = useUnreadCounts();

  const connect = useCallback((serverUrl: string, token: string) => {
    if (wsClientRef.current) {
      wsClientRef.current.close();
    }

    const wsUrl = serverUrl.replace(/^http/, 'ws') + '/api/v4/websocket';
    const wsClient = new WebSocketClient();
    
    serverUrlRef.current = serverUrl;
    tokenRef.current = token;
    wsClientRef.current = wsClient;
    
    dispatch(setConnectionStatus('connecting'));

    wsClient.addFirstConnectListener(() => {
      console.log('WebSocket: First connection established');
      dispatch(setConnectionStatus('connected'));
    });

    wsClient.addReconnectListener(() => {
      console.log('WebSocket: Reconnected');
      dispatch(setConnectionStatus('connected'));
    });

    wsClient.addCloseListener((event) => {
      console.log('WebSocket: Connection closed', event);
      dispatch(setConnectionStatus('disconnected'));
    });

    wsClient.addErrorListener((event) => {
      console.error('WebSocket: Error', event);
      dispatch(setConnectionError(event.toString()));
    });

    wsClient.addMessageListener((msg) => {
      try {
        if (msg.event && msg.data) {
          handleWebSocketEvent(msg.event, msg.data);
        }
      } catch (error) {
        console.error('WebSocket: Error handling message', error, msg);
      }
    });

    wsClient.initialize(wsUrl, token);
  }, [handleWebSocketEvent, dispatch]);

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
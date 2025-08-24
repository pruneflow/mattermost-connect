import { useCallback, useEffect, useRef } from 'react';
import { useAppSelector } from './useAppSelector';
import { selectWebSocketConnectionStatus } from "../store/selectors";
import { useAppDispatch } from './useAppDispatch';
import { setConnectionStatus, setConnectionError } from '../store/slices/websocketSlice';
import { incrementChannelUnreadCount, resetChannelUnreadCount, incrementTeamUnreadCount } from '../store/slices/entitiesSlice';
import { selectCurrentUserId, selectCurrentUser, selectChannelById } from '../store/selectors';
import { store } from '../store';
import { useChannelWebSocket } from './useChannelWebSocket';
import { useTeamWebSocket } from './useTeamWebSocket';
import { useTypingWebSocket } from './useTypingWebSocket';
import { usePreferencesWebSocket } from './usePreferencesWebSocket';
import { useMessageWebSocket } from './useMessageWebSocket';
import { useConfigWebSocket } from './useConfigWebSocket';
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
  const currentUserId = useAppSelector(selectCurrentUserId);
  const currentUser = useAppSelector(selectCurrentUser);

  const handleUnreadEvent = useCallback((event: string, data: any) => {
    switch (event) {
      case 'posted':
        if (data.post) {
          const post = typeof data.post === 'string' ? JSON.parse(data.post) : data.post;
          if(post.user_id !== currentUserId) {
            const channelId = post.channel_id;
            const teamId = data.team_id;
            // Use selector to get channel data without creating dependency
            const currentState = store.getState();
            const channel = selectChannelById(currentState, channelId);
            
            let msgCount = 1;
            let mentionCount = 0;
            
            if (channel?.type === 'D') {
              // Direct Messages: all messages are mentions, don't increment msg_count
              msgCount = 0;
              mentionCount = 1; // Every DM message is a mention
            } else {
              // Team channels: normal logic
              msgCount = 1;
              mentionCount = post.message?.includes(`@${currentUser?.username}`) ? 1 : 0;
            }

            // Update channel unread count in channels.unreads
            dispatch(incrementChannelUnreadCount({
              channelId,
              msgCount,
              mentionCount,
              fromCurrentUser: false,
            }));

            // Update team unread count
            if (teamId) {
              dispatch(incrementTeamUnreadCount({
                teamId,
                msgCount,
                mentionCount,
              }));
            }
          }
        }
        break;
        
      case 'channel_viewed':
        if (data.channel_id) {
          // Reset channel unread count in channels.unreads
          dispatch(resetChannelUnreadCount(data.channel_id));
        }
        break;
        
      default:
        // Ignore other events
        break;
    }
  }, [currentUserId, currentUser?.username, dispatch]);
  const { handleChannelEvent } = useChannelWebSocket();
  const { handleTeamEvent } = useTeamWebSocket();
  const { handleTypingEvent } = useTypingWebSocket();
  const { handlePreferencesEvent } = usePreferencesWebSocket();
  const { handleMessageEvent } = useMessageWebSocket();
  const { handleConfigEvent } = useConfigWebSocket();

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

    // Set up event handlers using new API (non-deprecated)
    wsClient.addMessageListener((msg: any) => {
      if (msg.event && msg.data) {
        // Route events to appropriate handlers
        handleTypingEvent(msg);
        handleUnreadEvent(msg.event, msg.data);
        handleChannelEvent(msg.event, msg.data, msg.broadcast);
        handleTeamEvent(msg.event, msg.data);
        handlePreferencesEvent(msg.event, msg.data);
        handleMessageEvent(msg.event, msg.data, msg.broadcast);
        handleConfigEvent(msg.event, msg.data);
      }
    });

    wsClient.addFirstConnectListener(() => {
      dispatch(setConnectionStatus('connected'));
    });
    wsClient.addReconnectListener(() => {
      dispatch(setConnectionStatus('connected'));
    });

    wsClient.addCloseListener(() => {
      dispatch(setConnectionStatus('disconnected'));
    });

    wsClient.addErrorListener((error: any) => {
      dispatch(setConnectionError('WebSocket connection error'));
    });

    // Connect with token
    wsClient.initialize(wsUrl, token);
  }, [handleUnreadEvent, handleChannelEvent, handleTeamEvent, handleTypingEvent, handlePreferencesEvent, handleMessageEvent, dispatch]);

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
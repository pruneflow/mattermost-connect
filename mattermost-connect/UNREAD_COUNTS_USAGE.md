# Unread Counts Usage Guide

This guide shows how to use the new unread counts functionality in MattermostConnect.

## Hook Usage

```typescript
import { useUnreadCounts } from '../hooks/useUnreadCounts';

function MyComponent() {
  const activeTeamId = 'team-123';
  
  const {
    // Data
    teamUnreads,           // Array of TeamUnread for all teams
    channelUnreads,        // Array of ChannelUnread for active team
    isLoading,
    
    // Utility functions
    getTeamUnreadCount,    // (teamId: string) => number
    getChannelUnreadCount, // (channelId: string) => number
    getTeamMentionCount,   // (teamId: string) => number
    getChannelMentionCount,// (channelId: string) => number
    
    // Actions
    markAsRead,           // (channelId: string) => Promise<void>
    incrementUnreadCount, // (channelId: string, teamId: string, mentionCount?: number) => void
    decrementUnreadCount, // (channelId: string, teamId: string, mentionCount?: number) => void
    resetChannelCount,   // (channelId: string) => void
  } = useUnreadCounts(activeTeamId);
  
  // Get specific counts
  const teamCount = getTeamUnreadCount('team-456');
  const channelCount = getChannelUnreadCount('channel-789');
  
  return (
    <div>
      <p>Team unread: {teamCount}</p>
      <p>Channel unread: {channelCount}</p>
    </div>
  );
}
```

## UI Badge Component

```typescript
import { UnreadBadge } from '../components/common/UnreadBadge';

function ChannelListItem({ channel, teamId, isActive }) {
  const { getChannelUnreadCount } = useUnreadCounts(teamId);
  const unreadCount = getChannelUnreadCount(channel.id);
  
  return (
    <UnreadBadge count={unreadCount}>
      <ListItemButton selected={isActive}>
        <ListItemText primary={channel.display_name} />
      </ListItemButton>
    </UnreadBadge>
  );
}

function TeamListItem({ team, isActive }) {
  const { getTeamUnreadCount } = useUnreadCounts();
  const unreadCount = getTeamUnreadCount(team.id);
  
  // Only show badge if team is not active
  return (
    <UnreadBadge count={isActive ? 0 : unreadCount}>
      <ListItemButton selected={isActive}>
        <ListItemText primary={team.display_name} />
      </ListItemButton>
    </UnreadBadge>
  );
}
```

## Integration in MattermostChat

```typescript
function MattermostChat() {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  
  // Pass activeTeamId to enable channel unread counts for active team
  const activeTeamId = selectedTeam?.id;
  
  return (
    <Box display="flex">
      <Box>
        <TeamList 
          selectedTeamId={selectedTeam?.id}
          onSelectTeam={setSelectedTeam}
          // TeamList can use useUnreadCounts() to show team badges
        />
      </Box>
      
      <Box>
        <ChannelList
          teamId={activeTeamId}
          selectedChannelId={selectedChannel?.id}
          onSelectChannel={setSelectedChannel}
          // ChannelList can use useUnreadCounts(activeTeamId) to show channel badges
        />
      </Box>
      
      <Box flex={1}>
        <MessageList 
          channelId={selectedChannel?.id}
          // useMessages automatically marks channel as read when channelId changes
        />
      </Box>
    </Box>
  );
}
```

## API Endpoints Used

- **`GET /users/me/teams/unread`** - Fetched once at startup for all team counts
- **`GET /users/me/teams/{teamId}/channels/unread`** - Fetched when team becomes active
- **`POST /channels/members/me/view`** - Called to mark channel as read

## WebSocket Events

The system automatically handles these WebSocket events:

- **`posted`** - Increments unread counts (except for active channel)
- **`post_deleted`** - Decrements unread counts (except for active channel)  
- **`channel_viewed`** - Resets channel count and adjusts team count

## Data Flow

1. **Initial Load**: Fetch team unread counts for all teams
2. **Team Selection**: Fetch channel unread counts for selected team
3. **Channel Selection**: Auto-mark channel as read via `useMessages`
4. **Real-time Updates**: WebSocket events update counts automatically
5. **UI Updates**: Components re-render with new badge counts

## Architecture Benefits

- ✅ **Performance**: Minimal API calls (fetch once, update via WebSocket)
- ✅ **Real-time**: Instant updates via WebSocket events
- ✅ **Simple**: Easy to use hooks and components
- ✅ **Consistent**: Team counts always = sum of channel counts
- ✅ **Hybrid**: Optimized for active channel, unread tracking for others
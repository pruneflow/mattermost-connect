/**
 * Skeleton loading components for various UI elements
 * Provides consistent loading states following Material-UI patterns
 */
import React from 'react';
import { Box, Card, Skeleton } from '@mui/material';

// Base skeleton animation config following Material-UI best practices
const skeletonAnimation = 'pulse' as const; // pulse is most natural for loading states

/**
 * Team List Item Skeleton
 * Matches the structure of TeamItem component
 */
export const TeamItemSkeleton: React.FC = () => (
  <Box 
    sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 2, 
      p: 1.5,
      borderRadius: 1,
    }}
  >
    {/* Team icon */}
    <Skeleton 
      variant="circular" 
      width={40} 
      height={40} 
      animation={skeletonAnimation}
    />
    
    {/* Team info */}
    <Box sx={{ flex: 1 }}>
      <Skeleton 
        variant="text" 
        width="60%" 
        height={20} 
        animation={skeletonAnimation}
      />
      <Skeleton 
        variant="text" 
        width="40%" 
        height={16} 
        animation={skeletonAnimation}
        sx={{ mt: 0.5 }} 
      />
    </Box>
    
    {/* Unread indicator */}
    <Skeleton 
      variant="circular" 
      width={8} 
      height={8} 
      animation={skeletonAnimation}
    />
  </Box>
);

/**
 * User Card Skeleton
 * Matches the structure of UserCard component
 */
export const UserCardSkeleton: React.FC = () => (
  <Card sx={{ p: 2, borderRadius: 2 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {/* Avatar */}
      <Skeleton 
        variant="circular" 
        width={48} 
        height={48} 
        animation={skeletonAnimation}
      />
      
      {/* User info */}
      <Box sx={{ flex: 1 }}>
        <Skeleton 
          variant="text" 
          width="70%" 
          height={24} 
          animation={skeletonAnimation}
        />
        <Skeleton 
          variant="text" 
          width="50%" 
          height={20} 
          animation={skeletonAnimation}
          sx={{ mt: 0.5 }} 
        />
        <Skeleton 
          variant="text" 
          width="30%" 
          height={16} 
          animation={skeletonAnimation}
          sx={{ mt: 0.5 }} 
        />
      </Box>
    </Box>
  </Card>
);

/**
 * Message Item Skeleton
 * Matches Mattermost message structure
 */
export const MessageItemSkeleton: React.FC = () => (
  <Box 
    sx={{ 
      display: 'flex', 
      gap: 1.5, 
      p: 1, 
      mb: 1,
      '&:hover': {
        bgcolor: 'action.hover',
      }
    }}
  >
    {/* User avatar */}
    <Skeleton 
      variant="circular" 
      width={36} 
      height={36} 
      animation={skeletonAnimation}
    />
    
    {/* Message content */}
    <Box sx={{ flex: 1 }}>
      {/* Header: username + timestamp */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
        <Skeleton 
          variant="text" 
          width={80} 
          height={16} 
          animation={skeletonAnimation}
        />
        <Skeleton 
          variant="text" 
          width={60} 
          height={14} 
          animation={skeletonAnimation}
        />
      </Box>
      
      {/* Message text */}
      <Skeleton 
        variant="text" 
        width="90%" 
        height={16} 
        animation={skeletonAnimation}
      />
      <Skeleton 
        variant="text" 
        width="70%" 
        height={16} 
        animation={skeletonAnimation}
        sx={{ mt: 0.25 }} 
      />
    </Box>
  </Box>
);

/**
 * Message List Skeleton
 * Shows multiple message skeletons for channel loading
 */
export const MessageListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <Box>
    {Array.from({ length: count }).map((_, index) => (
      <MessageItemSkeleton key={index} />
    ))}
  </Box>
);

/**
 * Channel List Item Skeleton
 * Matches channel list structure with # icon, name, and unread badge
 */
export const ChannelItemSkeleton: React.FC = () => (
  <Box 
    sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 1, 
      p: 1,
      borderRadius: 1,
    }}
  >
    {/* Channel icon (#) */}
    <Skeleton 
      variant="text" 
      width={16} 
      height={16} 
      animation={skeletonAnimation}
    />
    
    {/* Channel name */}
    <Skeleton 
      variant="text" 
      width="70%" 
      height={18} 
      animation={skeletonAnimation}
      sx={{ flex: 1 }}
    />
    
    {/* Unread badge */}
    <Skeleton 
      variant="circular" 
      width={16} 
      height={16} 
      animation={skeletonAnimation}
    />
  </Box>
);

/**
 * Channel List Skeleton
 * Shows multiple channel skeletons
 */
export const ChannelListSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => (
  <Box>
    {Array.from({ length: count }).map((_, index) => (
      <ChannelItemSkeleton key={index} />
    ))}
  </Box>
);

/**
 * User Menu Skeleton
 * For user profile loading in dropdown
 */
export const UserMenuSkeleton: React.FC = () => (
  <Box sx={{ py: 1, px: 2 }}>
    {/* User info */}
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
      <Skeleton 
        variant="circular" 
        width={40} 
        height={40} 
        animation={skeletonAnimation}
      />
      <Box sx={{ flex: 1 }}>
        <Skeleton 
          variant="text" 
          width="80%" 
          height={20} 
          animation={skeletonAnimation}
        />
        <Skeleton 
          variant="text" 
          width="60%" 
          height={16} 
          animation={skeletonAnimation}
          sx={{ mt: 0.5 }} 
        />
      </Box>
    </Box>
    
    {/* Menu items */}
    {Array.from({ length: 4 }).map((_, index) => (
      <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
        <Skeleton 
          variant="circular" 
          width={20} 
          height={20} 
          animation={skeletonAnimation}
        />
        <Skeleton 
          variant="text" 
          width="50%" 
          height={16} 
          animation={skeletonAnimation}
        />
      </Box>
    ))}
  </Box>
);

/**
 * Settings Dialog Skeleton
 * For settings loading state
 */
export const SettingsDialogSkeleton: React.FC = () => (
  <Box sx={{ p: 3 }}>
    {/* Section title */}
    <Skeleton 
      variant="text" 
      width="40%" 
      height={24} 
      animation={skeletonAnimation}
      sx={{ mb: 2 }}
    />
    
    {/* Settings items */}
    {Array.from({ length: 6 }).map((_, index) => (
      <Box key={index} sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Skeleton 
            variant="text" 
            width="60%" 
            height={18} 
            animation={skeletonAnimation}
          />
          <Skeleton 
            variant="rectangular" 
            width={40} 
            height={20} 
            animation={skeletonAnimation}
            sx={{ borderRadius: 1 }}
          />
        </Box>
        <Skeleton 
          variant="text" 
          width="80%" 
          height={14} 
          animation={skeletonAnimation}
        />
      </Box>
    ))}
  </Box>
);

/**
 * Generic List Skeleton
 * Reusable for any list structure
 */
export const ListSkeleton: React.FC<{ 
  count?: number; 
  height?: number;
  showAvatar?: boolean;
  avatarSize?: number;
}> = ({ 
  count = 5, 
  height = 48, 
  showAvatar = true, 
  avatarSize = 32 
}) => (
  <Box>
    {Array.from({ length: count }).map((_, index) => (
      <Box 
        key={index} 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2, 
          p: 1, 
          height 
        }}
      >
        {showAvatar && (
          <Skeleton 
            variant="circular" 
            width={avatarSize} 
            height={avatarSize} 
            animation={skeletonAnimation}
          />
        )}
        <Box sx={{ flex: 1 }}>
          <Skeleton 
            variant="text" 
            width="70%" 
            height={16} 
            animation={skeletonAnimation}
          />
          <Skeleton 
            variant="text" 
            width="50%" 
            height={14} 
            animation={skeletonAnimation}
            sx={{ mt: 0.5 }} 
          />
        </Box>
      </Box>
    ))}
  </Box>
);

/**
 * Form Skeleton
 * For loading forms like CreateTeamDialog
 */
export const FormSkeleton: React.FC<{ fieldCount?: number }> = ({ fieldCount = 4 }) => (
  <Box sx={{ p: 2 }}>
    {Array.from({ length: fieldCount }).map((_, index) => (
      <Box key={index} sx={{ mb: 3 }}>
        <Skeleton 
          variant="text" 
          width="30%" 
          height={16} 
          animation={skeletonAnimation}
          sx={{ mb: 1 }}
        />
        <Skeleton 
          variant="rectangular" 
          width="100%" 
          height={40} 
          animation={skeletonAnimation}
          sx={{ borderRadius: 1 }}
        />
        <Skeleton 
          variant="text" 
          width="60%" 
          height={14} 
          animation={skeletonAnimation}
          sx={{ mt: 0.5 }}
        />
      </Box>
    ))}
    
    {/* Action buttons */}
    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
      <Skeleton 
        variant="rectangular" 
        width={80} 
        height={36} 
        animation={skeletonAnimation}
        sx={{ borderRadius: 1 }}
      />
      <Skeleton 
        variant="rectangular" 
        width={100} 
        height={36} 
        animation={skeletonAnimation}
        sx={{ borderRadius: 1 }}
      />
    </Box>
  </Box>
);

export default {
  TeamItemSkeleton,
  UserCardSkeleton,
  MessageItemSkeleton,
  MessageListSkeleton,
  ChannelItemSkeleton,
  ChannelListSkeleton,
  UserMenuSkeleton,
  SettingsDialogSkeleton,
  ListSkeleton,
  FormSkeleton,
};
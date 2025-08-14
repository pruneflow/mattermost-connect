/**
 * Main application layout switcher component
 * Provides choice between Mattermost-style and custom layouts with configuration options
 */
import React from 'react';
import { SxProps, Theme } from '@mui/material';
import { MattermostLayout } from './MattermostLayout';
import { CustomLayout } from './CustomLayout';

export interface AppLayoutProps {
  children?: React.ReactNode;
  layout?: 'mattermost' | 'custom';
  showChannelHeader?: boolean;
  sidebarWidth?: number;
  focusedPostId?: string; // For permalink navigation
  sx?: SxProps<Theme>;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  layout = 'mattermost',
  showChannelHeader = true,
  sidebarWidth = 320,
  focusedPostId,
  sx,
}) => {
  if (layout === 'custom') {
    return (
      <CustomLayout 
        focusedPostId={focusedPostId}
        sx={sx}
      >
        {children}
      </CustomLayout>
    );
  }

  return (
    <MattermostLayout
      showChannelHeader={showChannelHeader}
      sidebarWidth={sidebarWidth}
      sx={sx}
    >
      {children}
    </MattermostLayout>
  );
};

export default AppLayout;
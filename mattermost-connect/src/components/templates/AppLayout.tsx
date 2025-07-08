import React from 'react';
import { SxProps, Theme } from '@mui/material';
import { MattermostLayout } from './MattermostLayout';
import { CustomLayout } from './CustomLayout';

export interface AppLayoutProps {
  children?: React.ReactNode;
  layout?: 'mattermost' | 'custom';
  showChannelHeader?: boolean;
  sidebarWidth?: number;
  sx?: SxProps<Theme>;
}

/**
 * AppLayout component - Main layout switcher
 * Provides either Mattermost-style layout or custom layout based on props
 */
export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  layout = 'mattermost',
  showChannelHeader = true,
  sidebarWidth = 320,
  sx,
}) => {
  if (layout === 'custom') {
    return (
      <CustomLayout sx={sx}>
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
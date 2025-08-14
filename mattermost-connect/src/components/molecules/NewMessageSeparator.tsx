/**
 * New message separator component for marking unread message boundaries
 * Displays a styled divider with "New Messages" text following Mattermost patterns
 */
import React from "react";
import Box from "@mui/material/Box";
import Divider from '@mui/material/Divider';

interface NotificationSeparatorProps {
  children?: React.ReactNode;
}

const NotificationSeparator: React.FC<NotificationSeparatorProps> = ({ children }) => {
  return (
    <Box
      data-testid='NotificationSeparator'
      sx={{
        position: 'relative',
        zIndex: 1,
        height: '1px',
        margin: 0,
        mt: '-1em',
        mb: '1em',
        pointerEvents: 'none',
        textAlign: 'center',
        '&::before, &::after': {
          position: 'absolute',
          left: 0,
          display: 'none',
          width: '100%',
          height: '1em',
          content: '""',
        },
        '&.hovered--after::before': {
          display: 'block',
          background: '#f5f5f5',
          bottom: 0,
        },
        '&.hovered--before::after': {
          display: 'block',
          background: '#f5f5f5',
          top: 0,
        },
        '@media print': {
          '.separator__hr': {
            top: '1.7em',
          },
        },
      }}
    >
      <Divider
        sx={{
          position: 'relative',
          zIndex: 5,
          top: '1em',
          borderTop: '1px solid',
          borderColor: 'rgba(var(--center-channel-color-rgb), 0.12)',
          margin: 0,
          background: 'transparent',
        }}
      />
      {children && (
        <Box
          sx={{
            position: 'relative',
            zIndex: 5,
            display: 'inline-flex',
            alignItems: 'center',
            px: '1em',
            borderRadius: '50px',
            backgroundColor: 'background.paper',
            color: 'text.primary',
            fontSize: '13px',
            fontWeight: 700,
            lineHeight: '2em',
            mt: '-1em',
          }}
        >
          {children}
        </Box>
      )}
    </Box>
  );
};

interface NewMessageSeparatorProps {
  children?: React.ReactNode;
}

export const NewMessageSeparator: React.FC<NewMessageSeparatorProps> = ({ children }) => {
  return (
    <Box
      sx={{
        py: 1,
        px: 2,
        backgroundColor: "background.paper",
        borderTop: "1px solid",
        borderBottom: "1px solid",
        borderColor: "divider",
        textAlign: "center",
      }}
      className="new-separator"
    >
      <NotificationSeparator>
        {children || "New Messages"}
      </NotificationSeparator>
    </Box>
  );
};
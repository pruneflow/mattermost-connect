// src/internal/components/common/TypingIndicator.tsx
/**
 * A component that shows who is currently typing
 */
import React from "react";
import { Box, Typography, Fade } from "@mui/material";
import { BaseComponentProps } from "../../types/componentTypes";

export interface TypingIndicatorProps extends BaseComponentProps {
  /** IDs of users who are typing */
  userIds: string[];
  /** Map of user IDs to display names */
  userNames: Record<string, string>;
  /** Whether to show the animation */
  animate?: boolean;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  userIds,
  userNames,
  animate = true,
  className,
  sx,
  id,
}) => {
  if (userIds.length === 0) {
    return null;
  }

  // Get display names for users who are typing
  const typingUsers = userIds
    .map((userId) => userNames[userId] || "Someone")
    .filter((name) => !!name);

  // Create text based on number of users
  let text = "";
  if (typingUsers.length === 1) {
    text = `${typingUsers[0]} is typing`;
  } else if (typingUsers.length === 2) {
    text = `${typingUsers[0]} and ${typingUsers[1]} are typing`;
  } else if (typingUsers.length === 3) {
    text = `${typingUsers[0]}, ${typingUsers[1]}, and ${typingUsers[2]} are typing`;
  } else if (typingUsers.length > 3) {
    text = "Several people are typing";
  }

  return (
    <Fade in={typingUsers.length > 0}>
      <Box
        className={className}
        sx={{
          display: "flex",
          alignItems: "center",
          height: 24,
          ...sx,
        }}
        id={id}
      >
        <Typography
          variant="caption"
          color="textSecondary"
          sx={{ fontStyle: "italic", mr: 0.5 }}
        >
          {text}
        </Typography>
        {animate && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
            }}
          >
            {[0, 1, 2].map((i) => (
              <Box
                key={i}
                sx={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  backgroundColor: "text.secondary",
                  mx: 0.25,
                  animation: "typingAnimation 1.4s infinite",
                  animationDelay: `${i * 0.2}s`,
                  "@keyframes typingAnimation": {
                    "0%": {
                      transform: "translateY(0)",
                    },
                    "50%": {
                      transform: "translateY(-3px)",
                    },
                    "100%": {
                      transform: "translateY(0)",
                    },
                  },
                }}
              />
            ))}
          </Box>
        )}
      </Box>
    </Fade>
  );
};

export default TypingIndicator;

// src/internal/components/common/Markdown.tsx
/**
 * A component for rendering Markdown content
 */
import React from "react";
import ReactMarkdown from "react-markdown";
import { Typography, Link, Box } from "@mui/material";
import { BaseComponentProps } from "../../types/componentTypes";

export interface MarkdownProps extends BaseComponentProps {
  /** Markdown content */
  content: string;
  /** Whether to sanitize the HTML */
  sanitize?: boolean;
}

const Markdown: React.FC<MarkdownProps> = ({
  content,
  sanitize = true,
  className,
  sx,
  id,
}) => {
  return (
    <Box className={className} sx={sx} id={id}>
      <ReactMarkdown
        components={{
          h1: ({ node, ...props }) => (
            <Typography variant="h4" gutterBottom {...props} />
          ),
          h2: ({ node, ...props }) => (
            <Typography variant="h5" gutterBottom {...props} />
          ),
          h3: ({ node, ...props }) => (
            <Typography variant="h6" gutterBottom {...props} />
          ),
          h4: ({ node, ...props }) => (
            <Typography variant="subtitle1" gutterBottom {...props} />
          ),
          h5: ({ node, ...props }) => (
            <Typography variant="subtitle2" gutterBottom {...props} />
          ),
          h6: ({ node, ...props }) => (
            <Typography variant="subtitle2" gutterBottom {...props} />
          ),
          p: ({ node, ...props }) => (
            <Typography variant="body1" paragraph {...props} />
          ),
          a: ({ node, ...props }) => <Link {...props} />,
          ul: ({ node, ...props }) => (
            <Box component="ul" sx={{ pl: 2 }} {...props} />
          ),
          ol: ({ node, ...props }) => (
            <Box component="ol" sx={{ pl: 2 }} {...props} />
          ),
          li: ({ node, ...props }) => (
            <Box component="li" sx={{ mb: 0.5 }} {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <Box
              component="blockquote"
              sx={{
                borderLeft: 4,
                borderColor: "divider",
                pl: 2,
                py: 1,
                my: 2,
                color: "text.secondary",
              }}
              {...props}
            />
          ),
          code: ({ node, inline, ...props }) =>
            inline ? (
              <Box
                component="code"
                sx={{
                  backgroundColor: "action.hover",
                  padding: 0.5,
                  borderRadius: 0.5,
                  fontFamily: "monospace",
                }}
                {...props}
              />
            ) : (
              <Box
                component="pre"
                sx={{
                  backgroundColor: "action.hover",
                  padding: 2,
                  borderRadius: 1,
                  overflow: "auto",
                  fontFamily: "monospace",
                  fontSize: "0.875rem",
                }}
              >
                <Box component="code" {...props} />
              </Box>
            ),
        }}
      >
        {content}
      </ReactMarkdown>
    </Box>
  );
};

export default Markdown;

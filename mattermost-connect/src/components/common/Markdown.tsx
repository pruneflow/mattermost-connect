import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Box, Link, Typography, Paper, styled } from '@mui/material';

const MarkdownContainer = styled(Box)(({ theme }) => ({
  '& p': {
    margin: '0.25em 0',
  },
  '& ul, & ol': {
    marginTop: '0.25em',
    marginBottom: '0.25em',
    paddingLeft: '1.5em',
  },
  '& li': {
    margin: '0.15em 0',
  },
  '& h1, & h2, & h3, & h4, & h5, & h6': {
    marginTop: '0.5em',
    marginBottom: '0.25em',
    fontWeight: 600,
  },
  '& h1': {
    fontSize: '1.5em',
  },
  '& h2': {
    fontSize: '1.3em',
  },
  '& h3': {
    fontSize: '1.15em',
  },
  '& h4, & h5, & h6': {
    fontSize: '1em',
  },
  '& blockquote': {
    borderLeft: `4px solid ${theme.palette.divider}`,
    margin: '0.5em 0',
    padding: '0.1em 0 0.1em 1em',
    color: theme.palette.text.secondary,
  },
  '& code': {
    backgroundColor: theme.palette.background.default,
    padding: '0.2em 0.4em',
    borderRadius: '3px',
    fontSize: '0.85em',
    fontFamily: 'monospace',
  },
  '& pre': {
    backgroundColor: theme.palette.background.default,
    padding: '0.7em 1em',
    borderRadius: '4px',
    overflow: 'auto',
    '& code': {
      backgroundColor: 'transparent',
      padding: 0,
    },
  },
  '& a': {
    color: theme.palette.primary.main,
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  '& img': {
    maxWidth: '100%',
    borderRadius: '4px',
  },
  '& table': {
    borderCollapse: 'collapse',
    width: '100%',
    margin: '0.5em 0',
  },
  '& th, & td': {
    border: `1px solid ${theme.palette.divider}`,
    padding: '0.5em',
    textAlign: 'left',
  },
  '& th': {
    backgroundColor: theme.palette.background.default,
  },
}));

interface MarkdownProps {
  content: string;
}

export default function Markdown({ content }: MarkdownProps) {
  // Don't render empty content
  if (!content || content.trim() === '') {
    return null;
  }

  return (
    <MarkdownContainer>
      <ReactMarkdown
        components={{
          h1: ({ node, ref, ...props }) => <Typography variant="h5" {...props} component="h1" gutterBottom />,
          h2: ({ node, ref, ...props }) => <Typography variant="h6" {...props} component="h2" gutterBottom />,
          h3: ({ node, ref, ...props }) => <Typography variant="subtitle1" {...props} component="h3" gutterBottom />,
          h4: ({ node, ref, ...props }) => <Typography variant="subtitle2" {...props} component="h4" gutterBottom />,
          h5: ({ node, ref, ...props }) => <Typography variant="body1" {...props} component="h5" gutterBottom sx={{ fontWeight: 'bold' }} />,
          h6: ({ node, ref, ...props }) => <Typography variant="body2" {...props} component="h6" gutterBottom sx={{ fontWeight: 'bold' }} />,
          p: ({ node, ref, ...props }) => <Typography variant="body1" {...props} component="p" paragraph />,
          a: ({ node, ref, ...props }) => <Link {...props} target="_blank" rel="noopener" />,
          ul: ({ node, ref, ...props }) => <Box component="ul" {...props} sx={{ my: 1 }} />,
          ol: ({ node, ref, ...props }) => <Box component="ol" {...props} sx={{ my: 1 }} />,
          li: ({ node, ref, ...props }) => <Box component="li" {...props} />,
          blockquote: ({ node, ref, ...props }) => (
            <Paper 
              elevation={0} 
              {...props} 
              component="blockquote" 
              sx={{ my: 1, borderLeft: 4, borderColor: 'divider', pl: 2, py: 0.5, bgcolor: 'background.default' }} 
            />
          ),
          code: ({ node, inline, ref, ...props }: any) => (
            inline ? (
              <Box 
                component="code" 
                {...props} 
                sx={{ 
                  bgcolor: 'background.paper', 
                  px: 0.5, 
                  borderRadius: 0.5, 
                  fontFamily: 'monospace',
                  fontSize: '0.85em'
                }} 
              />
            ) : (
              <Paper 
                elevation={0} 
                sx={{ 
                  my: 1, 
                  p: 1.5, 
                  bgcolor: 'background.default', 
                  borderRadius: 1, 
                  overflowX: 'auto' 
                }}
              >
                <Box 
                  component="pre" 
                  sx={{ 
                    m: 0, 
                    fontFamily: 'monospace',
                    fontSize: '0.85em', 
                    whiteSpace: 'pre-wrap', 
                    wordBreak: 'break-all' 
                  }}
                >
                  <Box component="code" {...props} sx={{ display: 'block' }} />
                </Box>
              </Paper>
            )
          ),
          img: ({ node, ref, ...props }) => (
            <Box 
              component="img" 
              {...props} 
              sx={{ 
                maxWidth: '100%', 
                height: 'auto', 
                borderRadius: 1,
                my: 1
              }} 
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </MarkdownContainer>
  );
}
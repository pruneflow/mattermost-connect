import React, { memo, useMemo } from 'react';
import { Box, Paper, Typography, IconButton, Tooltip, SxProps, Theme, useTheme } from '@mui/material';
import { ContentCopy as CopyIcon } from '@mui/icons-material';
import { extractCodeBlocks, formatCodeForClipboard } from '../../utils/codeUtils';

/**
 * Code block renderer component with syntax highlighting and copy functionality
 * Parses text for code blocks and renders them with proper formatting
 */

interface CodeBlockRendererProps {
  text: string;
  sx?: SxProps<Theme>;
}

interface CodeBlockProps {
  code: string;
  language: string;
  displayName: string;
  onCopy?: (code: string) => void;
}

const CodeBlock: React.FC<CodeBlockProps> = memo(({
  code,
  language,
  displayName,
  onCopy,
}) => {
  const theme = useTheme();
  
  const handleCopy = async () => {
    const formattedCode = formatCodeForClipboard(code, language);
    await navigator.clipboard.writeText(formattedCode);
    if (onCopy) {
      onCopy(code);
    }
  };
  
  return (
    <Paper
      elevation={0}
      sx={{
        backgroundColor: theme.palette.action.hover,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: theme.shape.borderRadius,
        marginBottom: theme.spacing(1),
        overflow: 'hidden',
      }}
    >
      {/* Header with language name and copy button */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: theme.spacing(0.5, 1),
          backgroundColor: theme.palette.action.selected,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 500 }}
        >
          {displayName}
        </Typography>
        
        <Tooltip title="Copy code" placement="top">
          <IconButton
            size="small"
            onClick={handleCopy}
            sx={{ 
              padding: theme.spacing(0.25),
              color: theme.palette.text.secondary,
            }}
          >
            <CopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      
      {/* Code content */}
      <Box
        component="pre"
        sx={{
          margin: 0,
          padding: theme.spacing(1),
          overflow: 'auto',
          fontFamily: 'monospace',
          fontSize: '0.875rem',
          lineHeight: 1.4,
          backgroundColor: 'transparent',
          
          '& code': {
            backgroundColor: 'transparent',
            padding: 0,
            borderRadius: 0,
            fontSize: 'inherit',
            lineHeight: 'inherit',
          },
        }}
      >
        <code className={`language-${language}`}>
          {code}
        </code>
      </Box>
    </Paper>
  );
});

CodeBlock.displayName = 'CodeBlock';

export const CodeBlockRenderer: React.FC<CodeBlockRendererProps> = memo(({
  text,
  sx,
}) => {
  const codeBlocks = useMemo(() => {
    return extractCodeBlocks(text);
  }, [text]);
  
  const textParts = useMemo(() => {
    if (codeBlocks.length === 0) return [{ type: 'text' as const, content: text }];
    
    const parts: Array<{ type: 'text' | 'code'; content: string; language?: string; displayName?: string }> = [];
    let lastIndex = 0;
    
    codeBlocks.forEach((block) => {
      if (block.startIndex > lastIndex) {
        parts.push({
          type: 'text' as const,
          content: text.slice(lastIndex, block.startIndex),
        });
      }
      
      parts.push({
        type: 'code' as const,
        content: block.content,
        language: block.language,
        displayName: block.displayName,
      });
      
      lastIndex = block.endIndex;
    });
    
    if (lastIndex < text.length) {
      parts.push({
        type: 'text' as const,
        content: text.slice(lastIndex),
      });
    }
    
    return parts;
  }, [text, codeBlocks]);
  
  const handleCopy = (code: string) => {
  };
  
  return (
    <Box className="code-block-renderer" sx={sx}>
      {textParts.map((part, index) => {
        if (part.type === 'code') {
          return (
            <CodeBlock
              key={index}
              code={part.content}
              language={part.language || 'text'}
              displayName={part.displayName || 'Plain Text'}
              onCopy={handleCopy}
            />
          );
        } else {
          return (
            <Box
              key={index}
              component="span"
              dangerouslySetInnerHTML={{ __html: part.content }}
            />
          );
        }
      })}
    </Box>
  );
});

CodeBlockRenderer.displayName = 'CodeBlockRenderer';
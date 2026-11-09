/**
 * Mobile debug console - shows logs at bottom of screen for mobile testing
 */
import React, { useState, useEffect } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { Close as CloseIcon, Clear as ClearIcon } from '@mui/icons-material';

interface LogEntry {
  id: number;
  timestamp: string;
  message: string;
  type: 'log' | 'warn' | 'error' | 'debug';
}

let logId = 0;
const logs: LogEntry[] = [];
const listeners: ((logs: LogEntry[]) => void)[] = [];

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.debug
};

const addLogEntry = (message: string, type: LogEntry['type']) => {
  const entry: LogEntry = {
    id: logId++,
    timestamp: new Date().toLocaleTimeString(),
    message: String(message),
    type
  };
  logs.push(entry);
  if (logs.length > 50) logs.shift(); // Keep only last 50 logs
  listeners.forEach(listener => listener([...logs]));
};

// Override console methods
console.log = (...args: any[]) => {
  originalConsole.log(...args);
  addLogEntry(args.map(arg => String(arg)).join(' '), 'log');
};

console.warn = (...args: any[]) => {
  originalConsole.warn(...args);
  addLogEntry(args.map(arg => String(arg)).join(' '), 'warn');
};

console.error = (...args: any[]) => {
  originalConsole.error(...args);
  addLogEntry(args.map(arg => String(arg)).join(' '), 'error');
};

console.debug = (...args: any[]) => {
  originalConsole.debug(...args);
  addLogEntry(args.map(arg => String(arg)).join(' '), 'debug');
};

// Clear function for the UI
const clearLogs = () => {
  logs.length = 0;
  listeners.forEach(listener => listener([]));
};

export const MobileDebugConsole: React.FC = () => {
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const updateLogs = (newLogs: LogEntry[]) => {
      setLogEntries(newLogs);
    };
    
    listeners.push(updateLogs);
    setLogEntries([...logs]);
    
    return () => {
      const index = listeners.indexOf(updateLogs);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  if (!isVisible) return null;

  const getColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'warn': return '#ff9800';
      case 'error': return '#f44336';
      case 'debug': return '#9c27b0';
      default: return '#2196f3';
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        color: 'white',
        zIndex: 9999,
        maxHeight: isMinimized ? '40px' : '200px',
        overflow: 'hidden',
        borderTop: '1px solid #333',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1,
          borderBottom: isMinimized ? 'none' : '1px solid #333',
          cursor: 'pointer'
        }}
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '12px' }}>
          Debug Console ({logEntries.length})
        </Typography>
        <Box>
          <IconButton 
            size="small" 
            onClick={(e) => { e.stopPropagation(); clearLogs(); }}
            sx={{ color: 'white', p: 0.5 }}
          >
            <ClearIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <IconButton 
            size="small" 
            onClick={(e) => { e.stopPropagation(); setIsVisible(false); }}
            sx={{ color: 'white', p: 0.5 }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Logs */}
      {!isMinimized && (
        <Box
          sx={{
            maxHeight: '160px',
            overflow: 'auto',
            p: 1,
            fontSize: '11px',
            fontFamily: 'monospace'
          }}
        >
          {logEntries.length === 0 ? (
            <Typography variant="body2" sx={{ opacity: 0.7, fontSize: '11px' }}>
              No logs yet...
            </Typography>
          ) : (
            logEntries.slice(-20).map((entry) => (
              <Box key={entry.id} sx={{ mb: 0.5, fontSize: '10px' }}>
                <span style={{ color: '#888' }}>{entry.timestamp}</span>{' '}
                <span style={{ color: getColor(entry.type) }}>
                  [{entry.type.toUpperCase()}]
                </span>{' '}
                <span>{entry.message}</span>
              </Box>
            ))
          )}
        </Box>
      )}
    </Box>
  );
};
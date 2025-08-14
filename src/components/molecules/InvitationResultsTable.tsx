/**
 * Invitation results table component for displaying batch invitation outcomes
 * Shows user information with success/error status and detailed messages
 */
import React from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { UserAvatar } from '../atoms/UserAvatar';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectUserProfiles } from '../../store/selectors';
import { displayUsername } from '../../utils/userUtils';

export interface InvitationResultRow {
  userId: string;
  status: 'success' | 'error';
  message: string;
}

export interface InvitationResultsTableProps {
  title?: string;
  rows: InvitationResultRow[];
}

const getRowBackgroundColor = (status: 'success' | 'error') => {
  return status === 'error' ? 'error.light' : 'success.light';
};

const getRowHoverColor = (status: 'success' | 'error') => {
  return status === 'error' ? 'error.main' : 'success.main';
};

const getTextColor = (status: 'success' | 'error') => {
  return status === 'error' ? 'error.contrastText' : 'success.contrastText';
};

/**
 * Reusable table component for displaying invitation results
 * Used for both channel and team invitations
 */
export const InvitationResultsTable: React.FC<InvitationResultsTableProps> = ({
  title = "Results",
  rows,
}) => {
  const userProfiles = useAppSelector(selectUserProfiles);

  if (rows.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => {
              const user = userProfiles[row.userId];
              const backgroundColor = getRowBackgroundColor(row.status);
              const hoverColor = getRowHoverColor(row.status);
              const textColor = getTextColor(row.status);

              return (
                <TableRow 
                  key={`${row.userId}-${index}`}
                  sx={{ 
                    backgroundColor,
                    '&:hover': {
                      backgroundColor: hoverColor
                    }
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <UserAvatar userId={row.userId} size="small" />
                      <Box>
                        <Typography variant="body2">
                          {user ? displayUsername(user, "full_name_nickname", true) : `User ${row.userId}`}
                        </Typography>
                        {user?.email && (
                          <Typography variant="caption" color="text.secondary">
                            {user.email}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      color={textColor}
                    >
                      {row.message}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default InvitationResultsTable;
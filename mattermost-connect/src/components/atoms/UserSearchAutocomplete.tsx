import React, { memo, useCallback } from "react";
import {
  Autocomplete,
  TextField,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Box,
  Typography,
  Chip,
  Paper,
} from "@mui/material";
import { UserAvatar } from "./UserAvatar";
import { useUserSearch } from "../../hooks/useUserSearch";
import { useAppSelector } from "../../hooks/useAppSelector";
import { selectUserProfiles } from "../../store/selectors";
import {
  displayUsername,
  isBot,
  isSystemBot,
  isSystemAdmin,
} from "../../utils/userUtils";

interface UserSearchAutocompleteProps {
  teamId: string;
  selectedUserIds: string[];
  onUserSelectionChange: (userIds: string[]) => void;
  onSearchTermChange: (term: string) => void;
  searchTerm: string;
}

const filterOptions = (options: string[]) => options;

// Memoized option component
const UserOption = memo(
  ({ userId, listItemProps }: { userId: string; listItemProps: any }) => {
    const userProfiles = useAppSelector(selectUserProfiles);
    const user = userProfiles[userId];

    if (!user) return null;

    const userIsSystemBot = isSystemBot(user);
    const userIsBot = isBot(user);
    const userIsSystemAdmin = isSystemAdmin(user);

    return (
      <ListItem {...listItemProps}>
        <ListItemAvatar>
          <UserAvatar userId={userId} size="small" />
        </ListItemAvatar>
        <ListItemText
          primary={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2">
                {displayUsername(user, "full_name_nickname", true)}
              </Typography>
              {userIsSystemAdmin && (
                <Chip
                  label="System Admin"
                  size="small"
                  color="error"
                  variant="outlined"
                  sx={{ fontSize: "0.65rem", height: 20 }}
                />
              )}
              {userIsSystemBot && (
                <Chip
                  label="System Bot"
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{ fontSize: "0.65rem", height: 20 }}
                />
              )}
              {userIsBot && !userIsSystemBot && (
                <Chip
                  label="Bot"
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{ fontSize: "0.65rem", height: 20 }}
                />
              )}
            </Box>
          }
          secondary={user.email}
          secondaryTypographyProps={{
            variant: "caption",
            color: "text.secondary",
          }}
        />
      </ListItem>
    );
  },
);

UserOption.displayName = "UserOption";

// Main memoized component
export const UserSearchAutocomplete = memo<UserSearchAutocompleteProps>(
  ({
    teamId,
    selectedUserIds,
    onUserSelectionChange,
    onSearchTermChange,
    searchTerm,
  }) => {
    const userProfiles = useAppSelector(selectUserProfiles);
    const { searchUsersNotInTeam, searchResults, isSearching, clearSearch } =
      useUserSearch();

    // Stable handlers
    const handleSearchChange = useCallback(
      (event: React.SyntheticEvent, value: string) => {
        onSearchTermChange(value);
        if (value.length >= 2) {
          searchUsersNotInTeam(value, teamId);
        } else if (value.length === 0) {
          // Only clear when completely empty, not on blur
          clearSearch();
        }
        // For values with 1 character, keep the term but don't search
      },
      [onSearchTermChange, searchUsersNotInTeam, teamId, clearSearch],
    );

    const handleSelectionChange = useCallback(
      (event: React.SyntheticEvent, newValue: string[]) => {
        onUserSelectionChange(newValue);
      },
      [onUserSelectionChange],
    );

    // Stable render functions - no dependencies
    const renderOption = useCallback(
      (
        props: React.HTMLAttributes<HTMLLIElement> & { key: any },
        userId: string,
      ) => {
        const { key, ...listItemProps } = props;
        return (
          <UserOption key={key} userId={userId} listItemProps={listItemProps} />
        );
      },
      [],
    );

    const renderInput = (params: any) => (
      <TextField
        {...params}
        variant="outlined"
        placeholder={
          !selectedUserIds || selectedUserIds.length === 0
            ? "Search users by name or username"
            : undefined
        }
      />
    );

    const renderValue = (
      value: readonly string[],
      getItemProps: (params: { index: number }) => any,
    ) => {
      if (!value || value.length === 0) return null;
      return (
        <Paper
          sx={{
            display: "flex",
            justifyContent: "flex-start",
            flexWrap: "wrap",
            listStyle: "none",
            p: 0.5,
            m: 0,
          }}
        >
          {value
            .map((userId: string, index: number) => {
              const user = userProfiles[userId];
              if (!user) return null;
              const { key, ...itemProps } = getItemProps({ index });

              return (
                <Chip
                  key={`chip_value_user_${userId}_${key}`}
                  variant="outlined"
                  avatar={<UserAvatar userId={userId} size="xs" />}
                  label={displayUsername(user, "full_name_nickname", true)}
                  size="medium"
                  {...itemProps}
                />
              );
            })
            .filter(Boolean)}
        </Paper>
      );
    };

    /*  const renderValue = useCallback(
    (value: string[], getItemProps: (params: { index: number }) => any) => {
      if (!value || value.length === 0) return null;
      
      return value.map((userId, index) => {
        const user = userProfiles[userId];
        if (!user) return null;

        const itemProps = getItemProps({ index });
        const { key, ...chipProps } = itemProps;
        
        return (
          <Chip
            key={`chip_value_user_${userId}_${key}`}
            variant="outlined"
            avatar={<UserAvatar userId={userId} size="xs" />}
            label={`@${user.username}`}
            size="small"
            sx={{ maxWidth: 200 }}
            {...chipProps}
          />
        );
      }).filter(Boolean);
    },
    [],
  )*/ const getOptionLabel = useCallback(
      (userId: string) => userProfiles[userId]?.username || userId,
      [userProfiles],
    );

    const noOptionsText =
      searchTerm.length < 2
        ? "Type at least 2 characters to search"
        : isSearching
          ? "Searching..."
          : "No users found";
    return (
      <Autocomplete
        multiple
        id="tags-filled"
        options={searchResults}
        freeSolo
        inputValue={searchTerm}
        onInputChange={handleSearchChange}
        onChange={handleSelectionChange}
        renderOption={renderOption}
        renderInput={renderInput}
        renderValue={renderValue}
        noOptionsText={noOptionsText}
        loading={isSearching}
        getOptionLabel={getOptionLabel}
        filterOptions={filterOptions}
        clearOnBlur={false}
        blurOnSelect={false}
      />
    );
  },
);

UserSearchAutocomplete.displayName = "UserSearchAutocomplete";

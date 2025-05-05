import {
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import { UserStatus } from "../../../types";
import React from "react";

const StatusSelector: React.FC<{
  initialStatus: UserStatus;
  onDataChange?: (data: { status: UserStatus }) => void;
}> = ({ initialStatus, onDataChange }) => {
  const [status, setStatus] = React.useState<UserStatus>(initialStatus);

  // Mettre à jour les données du parent quand le statut change
  React.useEffect(() => {
    if (onDataChange) {
      onDataChange({ status });
    }
  }, [status, onDataChange]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStatus(event.target.value as UserStatus);
  };

  return (
    <FormControl component="fieldset">
      <FormLabel component="legend">Select Status</FormLabel>
      <RadioGroup
        value={status}
        onChange={handleChange}
        sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 2 }}
      >
        <FormControlLabel
          value="online"
          control={<Radio />}
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: "success.main",
                }}
              />
              <Typography>Online</Typography>
            </Box>
          }
        />
        <FormControlLabel
          value="away"
          control={<Radio />}
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: "warning.main",
                }}
              />
              <Typography>Away</Typography>
            </Box>
          }
        />
        <FormControlLabel
          value="dnd"
          control={<Radio />}
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: "error.main",
                }}
              />
              <Typography>Do Not Disturb</Typography>
            </Box>
          }
        />
        <FormControlLabel
          value="offline"
          control={<Radio />}
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: "text.disabled",
                }}
              />
              <Typography>Offline</Typography>
            </Box>
          }
        />
      </RadioGroup>
    </FormControl>
  );
};

export default StatusSelector;

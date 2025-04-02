// src/components/channels/SpaceSelector.jsx
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useMattermostSpaces } from "../../hooks/useMattermostSpaces";

const SpaceSelector = ({ activeSpaceId, onSpaceChange }) => {
  const { t } = useTranslation();
  const { spaces } = useMattermostSpaces();

  const handleChange = (event) => {
    onSpaceChange(event.target.value);
  };

  return (
    <FormControl fullWidth>
      <InputLabel id="space-select-label">
        {t("channels.selectSpace")}
      </InputLabel>
      <Select
        labelId="space-select-label"
        id="space-select"
        value={activeSpaceId || ""}
        label={t("channels.selectSpace")}
        onChange={handleChange}
      >
        {spaces?.map((space) => (
          <MenuItem key={space.id} value={space.id}>
            {space.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default SpaceSelector;

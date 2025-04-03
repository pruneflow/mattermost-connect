// src/components/team-members/MemberList.jsx
import { useState } from "react";
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Box,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  Chip,
  Avatar,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  SmartToy as BotIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { LoadingState, ErrorState } from "../common";
import UserRoleChip from "./UserRoleChip";

const MemberList = ({
  members,
  isLoading,
  error,
  onRefresh,
  onUpdateRole,
  onRemoveMember,
  isUpdatingRole,
  isRemovingMember,
}) => {
  const { t } = useTranslation();
  const [selectedMember, setSelectedMember] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  // Handler pour l'ouverture de la boîte de dialogue de suppression
  const handleOpenDeleteDialog = (member) => {
    setSelectedMember(member);
    setDeleteDialogOpen(true);
  };

  // Handler pour la fermeture de la boîte de dialogue de suppression
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedMember(null);
  };

  // Handler pour la confirmation de suppression
  const handleConfirmDelete = () => {
    if (selectedMember) {
      onRemoveMember(selectedMember.id);
    }
    handleCloseDeleteDialog();
  };

  // Handler pour la mise à jour du rôle
  const handleRoleChange = (member, isAdmin) => {
    onUpdateRole(member.id, isAdmin);
  };

  // Détecter si un membre est un bot
  const isBot = (member) => {
    return (
      member.isBot === true || // Utiliser la propriété isBot si elle est définie
      member.username?.startsWith("bot-") ||
      member.email?.includes("@mattermost-admin.local") ||
      (member.roles && member.roles.includes("system_bot")) ||
      (member.props && member.props.is_bot === "true")
    );
  };

  // Déterminer si un membre est un administrateur système
  const isSystemAdmin = (member) => {
    return (
      member.isSystemAdmin === true || member.roles?.includes("system_admin")
    );
  };

  // Filtrer les membres selon la recherche et le filtre de rôle
  const filteredMembers = members.filter((member) => {
    // Correspond au terme de recherche
    const matchesSearch =
      searchTerm === "" ||
      member.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${member.firstName || ""} ${member.lastName || ""}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    // Évaluer les rôles pour le filtrage
    const memberIsBot = isBot(member);
    const memberIsSystemAdmin = isSystemAdmin(member);
    const memberIsTeamAdmin =
      member.isAdmin || member.roles?.includes("team_admin");
    // Correspond au filtre de rôle
    let matchesRole = true;
    switch (filterRole) {
      case "bot":
        matchesRole = memberIsBot;
        break;
      case "systemAdmin":
        matchesRole = memberIsSystemAdmin;
        break;
      case "owner":
        matchesRole = member.isOwner;
        break;
      case "admin":
        matchesRole = memberIsTeamAdmin && !member.isOwner;
        break;
      case "member":
        matchesRole =
          !memberIsBot &&
          !memberIsSystemAdmin &&
          !memberIsTeamAdmin &&
          !member.isOwner &&
          !member.isPending;
        break;
      case "pending":
        matchesRole = member.isPending;
        break;
      default: // "all"
        matchesRole = true;
        break;
    }

    return matchesSearch && matchesRole;
  });

  // Afficher l'état de chargement
  if (isLoading) {
    return <LoadingState />;
  }

  // Afficher l'état d'erreur
  if (error) {
    return <ErrorState error={error} onRetry={onRefresh} />;
  }

  // Afficher un message si aucun membre n'est trouvé
  if (!members || members.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="body1" color="textSecondary" component={"div"}>
          {t("members.noMembers")}
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      {/* Barre de recherche et filtres */}
      <Box sx={{ mb: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <TextField
          placeholder={t("members.search")}
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flexGrow: 1, minWidth: "200px" }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="role-filter-label">
            {t("members.filterByRole")}
          </InputLabel>
          <Select
            labelId="role-filter-label"
            id="role-filter"
            value={filterRole}
            label={t("members.filterByRole")}
            onChange={(e) => setFilterRole(e.target.value)}
            startAdornment={
              <InputAdornment position="start">
                <FilterIcon />
              </InputAdornment>
            }
          >
            <MenuItem value="all">{t("members.allRoles")}</MenuItem>
            <MenuItem value="bot">{t("members.roles.bot")}</MenuItem>
            <MenuItem value="systemAdmin">
              {t("members.roles.systemAdmin")}
            </MenuItem>
            <MenuItem value="owner">{t("members.roles.owner")}</MenuItem>
            <MenuItem value="admin">{t("members.roles.admin")}</MenuItem>
            <MenuItem value="member">{t("members.roles.member")}</MenuItem>
            <MenuItem value="pending">{t("members.roles.pending")}</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Afficher le nombre de résultats */}
      <Box sx={{ mb: 1 }}>
        <Typography variant="body2" color="textSecondary">
          {t("members.resultsCount", {
            count: filteredMembers.length,
            total: members.length,
          })}
        </Typography>
      </Box>

      <Paper>
        <TableContainer>
          <Table aria-label={t("members.tableAriaLabel")}>
            <TableHead>
              <TableRow>
                <TableCell>{t("members.username")}</TableCell>
                <TableCell>{t("members.email")}</TableCell>
                <TableCell align="center">{t("members.roleColumn")}</TableCell>
                <TableCell align="center">{t("members.isAdmin")}</TableCell>
                <TableCell align="right">{t("members.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMembers.map((member) => {
                const memberIsBot = isBot(member);
                const memberIsSystemAdmin = isSystemAdmin(member);

                return (
                  <TableRow
                    key={member.id}
                    sx={{
                      backgroundColor: memberIsBot
                        ? "rgba(3, 169, 244, 0.05)"
                        : memberIsSystemAdmin
                          ? "rgba(211, 47, 47, 0.05)"
                          : member.isOwner
                            ? "rgba(156, 39, 176, 0.05)"
                            : "inherit",
                    }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        {memberIsBot ? (
                          <Tooltip title={t("members.tooltips.bot")}>
                            <BotIcon sx={{ mr: 1, color: "info.main" }} />
                          </Tooltip>
                        ) : member.isCurrentUser ? (
                          <Tooltip title={t("members.you")}>
                            <PersonIcon sx={{ mr: 1, color: "primary.main" }} />
                          </Tooltip>
                        ) : (
                          <PersonIcon sx={{ mr: 1, color: "action.active" }} />
                        )}
                        <Typography
                          variant="body2"
                          component="span"
                          fontWeight={
                            memberIsBot || memberIsSystemAdmin || member.isOwner
                              ? "medium"
                              : "inherit"
                          }
                        >
                          {member.username || t("members.pendingUser")}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell align="center">
                      <UserRoleChip member={member} />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip
                        title={
                          memberIsBot
                            ? t("members.tooltips.botNoRoleChange")
                            : memberIsSystemAdmin
                              ? t("members.tooltips.systemAdminNoRoleChange")
                              : member.isCurrentUser
                                ? t("members.cannotChangeOwnRole")
                                : member.isOwner
                                  ? t("members.cannotChangeOwnerRole")
                                  : member.isPending
                                    ? t("members.pendingUserNoRoleChange")
                                    : t("members.toggleAdminPermission")
                        }
                      >
                        <span>
                          <Switch
                            checked={
                              // Cette expression doit évaluer à true pour tous les types d'admin
                              member.isAdmin ||
                              member.roles?.includes("team_admin") ||
                              memberIsSystemAdmin ||
                              memberIsBot ||
                              member.isOwner
                            }
                            onChange={(e) =>
                              handleRoleChange(member, e.target.checked)
                            }
                            disabled={
                              memberIsBot ||
                              memberIsSystemAdmin ||
                              member.isCurrentUser ||
                              isUpdatingRole ||
                              member.isPending ||
                              member.isOwner
                            }
                            color="primary"
                            inputProps={{
                              "aria-label": t("members.toggleAdmin"),
                            }}
                          />
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip
                        title={
                          memberIsBot
                            ? t("members.tooltips.cannotRemoveBot")
                            : member.isCurrentUser
                              ? t("members.cannotRemoveYourself")
                              : member.isOwner
                                ? t("members.cannotRemoveOwner")
                                : memberIsSystemAdmin
                                  ? t(
                                      "members.tooltips.cannotRemoveSystemAdmin",
                                    )
                                  : t("members.remove.tooltip")
                        }
                      >
                        <span>
                          <IconButton
                            onClick={() => handleOpenDeleteDialog(member)}
                            disabled={
                              memberIsBot ||
                              memberIsSystemAdmin ||
                              member.isCurrentUser ||
                              isRemovingMember ||
                              member.isOwner
                            }
                            color="error"
                            size="small"
                            data-testid="remove-member-button"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Dialogue de confirmation de suppression */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          {t("members.remove.title")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            {t("members.remove.message", {
              name: selectedMember
                ? selectedMember.username || selectedMember.email
                : "",
            })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            disabled={isRemovingMember}
            startIcon={
              isRemovingMember ? (
                <CircularProgress size={20} color="inherit" />
              ) : null
            }
          >
            {t("members.remove.confirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MemberList;

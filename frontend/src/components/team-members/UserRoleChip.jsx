// src/components/team-members/UserRoleChip.jsx
import { Chip, Tooltip, Stack, Box } from "@mui/material";
import {
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  LockPerson as OwnerIcon,
  HourglassEmpty as PendingIcon,
  SmartToy as BotIcon,
  Security as SystemAdminIcon,
  SupervisorAccount as TeamAdminIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

/**
 * Composant amélioré pour afficher le(s) rôle(s) d'un utilisateur avec des icônes et couleurs appropriées
 */
const UserRoleChip = ({ member }) => {
  const { t } = useTranslation();

  // Analyser les différents rôles système et d'équipe
  const isSystemAdmin = member.roles?.includes("system_admin");
  const isTeamAdmin = member.roles?.includes("team_admin");
  const isBot =
    member.username?.startsWith("bot-") ||
    member.email?.includes("@mattermost-admin.local") ||
    (member.roles && member.roles.includes("system_bot"));

  // Afficher plusieurs puces pour représenter les différents types de rôles
  const renderChips = () => {
    const chips = [];

    // Priorité spéciale: bot, system admin, puis team/space admin, puis les autres rôles
    if (isBot) {
      chips.push(
        <Tooltip
          key="bot"
          title={t("members.tooltips.bot")}
          arrow
          placement="top"
        >
          <Chip
            icon={<BotIcon />}
            label={t("members.roles.bot")}
            color="info"
            size="small"
            variant={member.isCurrentUser ? "outlined" : "filled"}
          />
        </Tooltip>,
      );
    }

    if (isSystemAdmin) {
      chips.push(
        <Tooltip
          key="system-admin"
          title={t("members.tooltips.systemAdmin")}
          arrow
          placement="top"
        >
          <Chip
            icon={<SystemAdminIcon />}
            label={t("members.roles.systemAdmin")}
            color="error"
            size="small"
            variant={member.isCurrentUser ? "outlined" : "filled"}
          />
        </Tooltip>,
      );
    }

    if (member.isOwner) {
      chips.push(
        <Tooltip
          key="owner"
          title={t("members.tooltips.owner")}
          arrow
          placement="top"
        >
          <Chip
            icon={<OwnerIcon />}
            label={t("members.roles.owner")}
            color="secondary"
            size="small"
            variant={member.isCurrentUser ? "outlined" : "filled"}
          />
        </Tooltip>,
      );
    } else if (isTeamAdmin || member.isAdmin) {
      chips.push(
        <Tooltip
          key="team-admin"
          title={t("members.tooltips.admin")}
          arrow
          placement="top"
        >
          <Chip
            icon={<TeamAdminIcon />}
            label={t("members.roles.admin")}
            color="primary"
            size="small"
            variant={member.isCurrentUser ? "outlined" : "filled"}
          />
        </Tooltip>,
      );
    } else if (member.isPending) {
      chips.push(
        <Tooltip
          key="pending"
          title={t("members.tooltips.pending")}
          arrow
          placement="top"
        >
          <Chip
            icon={<PendingIcon />}
            label={t("members.roles.pending")}
            color="warning"
            size="small"
            variant={member.isCurrentUser ? "outlined" : "filled"}
          />
        </Tooltip>,
      );
    } else {
      chips.push(
        <Tooltip
          key="member"
          title={t("members.tooltips.member")}
          arrow
          placement="top"
        >
          <Chip
            icon={<PersonIcon />}
            label={t("members.roles.member")}
            color="default"
            size="small"
            variant={member.isCurrentUser ? "outlined" : "filled"}
          />
        </Tooltip>,
      );
    }

    return chips;
  };

  // Si l'utilisateur n'a qu'un seul rôle, retourner une puce unique
  if (
    !isSystemAdmin &&
    !isTeamAdmin &&
    !isBot &&
    (member.isOwner ||
      member.isAdmin ||
      member.isPending ||
      !member.isCurrentUser)
  ) {
    const chips = renderChips();
    return chips[0];
  }

  // Sinon, retourner une pile de puces pour montrer plusieurs rôles
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
      {renderChips()}
    </Stack>
  );
};

export default UserRoleChip;

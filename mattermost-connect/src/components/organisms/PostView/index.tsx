import { useAppSelector } from "../../../hooks";
import {
  selectChannelById,
  selectCurrentChannelId,
  selectCurrentTeam,
  selectMyChannelMember, selectPreferedChannelScrollPosition
} from "../../../store/selectors";
import { Team, EnrichedChannel } from "../../../api/types";
import { PostView } from "./PostView";

export { default as ToastWrapper } from './ToastWrapper';

export const isChannelLoading = (
  channel: EnrichedChannel,
  team: Team,
) => {
  if (channel && team) {
    const teamId = team.id;
    return !!(channel.team_id && channel.team_id !== teamId);

  }

  return true;
};

export const PostViewContainer = () => {
  const channelId = useAppSelector(selectCurrentChannelId);
  const team = useAppSelector(selectCurrentTeam);
  const channel = useAppSelector((state) =>
    selectChannelById(state, channelId),
  );
  if (!channelId || !channel || !team) return null;

  return <View channel={channel} team={team} />;
};

const View = ({ channel, team }: { channel: EnrichedChannel; team: Team }) => {
  // Sélectionne une fois l'état global
  const channelMember = useAppSelector(selectMyChannelMember(channel.id));

  let lastViewedAt = channelMember?.last_viewed_at;
  if (channel) {
    lastViewedAt = channel.last_post_at ? lastViewedAt : channel.last_post_at;
  }
  const loading: boolean = isChannelLoading(channel, team);
  const unreadScrollPosition = useAppSelector(state => selectPreferedChannelScrollPosition(state));

  return (
    <PostView
      channelId={channel.id}
      unreadScrollPosition={unreadScrollPosition}
      lastViewedAt={lastViewedAt}
      channelLoading={loading}
    />
  );
};

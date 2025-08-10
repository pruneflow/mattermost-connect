import { store } from '../store';
import { setCurrentTeamId } from "../store";

export const switchTeam = (teamId: string) => {
  store.dispatch(setCurrentTeamId(teamId));
};
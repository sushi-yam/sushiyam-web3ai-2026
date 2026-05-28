import type { IncidentType } from "../types";

export const locationKey = (teamId: string) => `loc:${teamId}`;
export const channelKey = (teamId: string) => `chan:${teamId}`;
export const dispatchKey = (teamId: string, ts: string) => `dispatch:${teamId}:${ts}`;
export const learningKey = (teamId: string, type: IncidentType, ts: string) =>
  `learn:${teamId}:${type}:${ts}`;
export const learningIndexKey = (teamId: string, type: IncidentType) =>
  `learn-index:${teamId}:${type}`;
export const teamsKey = () => `teams`;

import type { Env, DispatchEvent, LearnedKnowledge, IncidentType } from "../types";
import {
  locationKey,
  channelKey,
  dispatchKey,
  learningKey,
  learningIndexKey,
  teamsKey,
} from "./keys";

const MAX_LEARNINGS_RETURNED = 5;

export async function getLocation(env: Env, teamId: string): Promise<string | null> {
  return await env.RECALL_KV.get(locationKey(teamId));
}

export async function setLocation(env: Env, teamId: string, presetId: string): Promise<void> {
  await env.RECALL_KV.put(locationKey(teamId), presetId);
  await addTeam(env, teamId);
}

export async function getChannel(env: Env, teamId: string): Promise<string | null> {
  return await env.RECALL_KV.get(channelKey(teamId));
}

export async function setChannel(env: Env, teamId: string, channel: string): Promise<void> {
  await env.RECALL_KV.put(channelKey(teamId), channel);
  await addTeam(env, teamId);
}

export async function appendDispatch(
  env: Env,
  teamId: string,
  ev: DispatchEvent,
): Promise<void> {
  await env.RECALL_KV.put(dispatchKey(teamId, ev.ts), JSON.stringify(ev));
}

export async function appendLearning(
  env: Env,
  teamId: string,
  rec: LearnedKnowledge,
): Promise<void> {
  await env.RECALL_KV.put(learningKey(teamId, rec.type, rec.ts), JSON.stringify(rec));
  const idxKey = learningIndexKey(teamId, rec.type);
  const cur = await env.RECALL_KV.get(idxKey);
  let list: string[] = [];
  if (cur) {
    try {
      const parsed = JSON.parse(cur);
      if (Array.isArray(parsed)) list = parsed.filter((x): x is string => typeof x === "string");
    } catch {
      list = [];
    }
  }
  list.unshift(rec.ts);
  await env.RECALL_KV.put(idxKey, JSON.stringify(list));
}

export async function listLearningsByType(
  env: Env,
  teamId: string,
  type: IncidentType,
): Promise<LearnedKnowledge[]> {
  const idxKey = learningIndexKey(teamId, type);
  const cur = await env.RECALL_KV.get(idxKey);
  if (!cur) return [];
  let list: string[] = [];
  try {
    const parsed = JSON.parse(cur);
    if (Array.isArray(parsed)) list = parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
  const slice = list.slice(0, MAX_LEARNINGS_RETURNED);
  const out: LearnedKnowledge[] = [];
  for (const ts of slice) {
    const raw = await env.RECALL_KV.get(learningKey(teamId, type, ts));
    if (!raw) continue;
    try {
      out.push(JSON.parse(raw) as LearnedKnowledge);
    } catch {
      continue;
    }
  }
  return out;
}

async function addTeam(env: Env, teamId: string): Promise<void> {
  const cur = await env.RECALL_KV.get(teamsKey());
  let list: string[] = [];
  if (cur) {
    try {
      const parsed = JSON.parse(cur);
      if (Array.isArray(parsed)) list = parsed.filter((x): x is string => typeof x === "string");
    } catch {
      list = [];
    }
  }
  if (!list.includes(teamId)) {
    list.push(teamId);
    await env.RECALL_KV.put(teamsKey(), JSON.stringify(list));
  }
}

export async function listTeams(env: Env): Promise<string[]> {
  const cur = await env.RECALL_KV.get(teamsKey());
  if (!cur) return [];
  try {
    const parsed = JSON.parse(cur);
    if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    /* fall through */
  }
  return [];
}

import type { SlackEvent } from "./types";

const SLACK_API = "https://slack.com/api";

export function parseEvent(body: string): SlackEvent {
  return JSON.parse(body) as SlackEvent;
}

export async function postMessage(
  channel: string,
  text: string,
  token: string,
  threadTs?: string,
): Promise<void> {
  const body: Record<string, unknown> = { channel, text };
  if (threadTs) body.thread_ts = threadTs;
  const res = await fetch(`${SLACK_API}/chat.postMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error("postMessage HTTP error", res.status, await res.text());
  } else {
    const j = (await res.json()) as { ok?: boolean; error?: string };
    if (!j.ok) console.error("postMessage error", j.error);
  }
}

export async function postEphemeral(
  channel: string,
  user: string,
  text: string,
  token: string,
): Promise<void> {
  const res = await fetch(`${SLACK_API}/chat.postEphemeral`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ channel, user, text }),
  });
  if (!res.ok) {
    console.error("postEphemeral HTTP error", res.status, await res.text());
  } else {
    const j = (await res.json()) as { ok?: boolean; error?: string };
    if (!j.ok) console.error("postEphemeral error", j.error);
  }
}

export async function downloadFile(
  url: string,
  token: string,
): Promise<{ bytes: ArrayBuffer; mimeType: string }> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`downloadFile failed: ${res.status}`);
  }
  const mimeType = res.headers.get("Content-Type") || "application/octet-stream";
  const bytes = await res.arrayBuffer();
  return { bytes, mimeType };
}

export async function addReaction(
  channel: string,
  timestamp: string,
  name: string,
  token: string,
): Promise<void> {
  const res = await fetch(`${SLACK_API}/reactions.add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ channel, timestamp, name }),
  });
  if (!res.ok) {
    console.error("addReaction HTTP error", res.status, await res.text());
  } else {
    const j = (await res.json()) as { ok?: boolean; error?: string };
    if (!j.ok) console.error("addReaction error", j.error);
  }
}

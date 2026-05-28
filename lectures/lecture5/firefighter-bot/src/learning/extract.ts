import type { Env, IncidentType, LearnedKnowledge } from "../types";
import { downloadFile, addReaction } from "../slack";
import { analyzeImage, parseJsonLoose } from "../gemini";
import { appendLearning } from "../storage";

const VALID_TYPES: IncidentType[] = [
  "structure-fire",
  "wildland-fire",
  "vehicle-accident",
  "medical",
  "hazmat",
  "rescue",
  "other",
];

function buildPrompt(comment: string): string {
  return `この写真と添えられたコメントから、次回同種の出動で最も重要な1つの教訓を抽出してください。

コメント: ${comment}

JSON 形式で: {"type": "structure-fire|wildland-fire|vehicle-accident|medical|hazmat|rescue|other のどれか", "insight": "1〜2文の日本語の教訓", "keywords": ["日本語キーワード3〜5個"]}`;
}

function normalizeType(t: unknown): IncidentType {
  if (typeof t === "string" && (VALID_TYPES as string[]).includes(t)) return t as IncidentType;
  return "other";
}

function normalizeKeywords(k: unknown): string[] {
  if (!Array.isArray(k)) return [];
  return k.filter((x): x is string => typeof x === "string").slice(0, 10);
}

export async function extractAndStore(args: {
  env: Env;
  teamId: string;
  channel: string;
  ts: string;
  text: string;
  fileUrl: string;
  mimeType?: string;
  token: string;
  apiKey: string;
}): Promise<void> {
  const { env, teamId, channel, ts, text, fileUrl, mimeType, token, apiKey } = args;
  try {
    const dl = await downloadFile(fileUrl, token);
    const effectiveMime = mimeType || dl.mimeType;
    const raw = await analyzeImage(dl.bytes, effectiveMime, buildPrompt(text), apiKey);
    const parsed = parseJsonLoose(raw) as
      | { type?: unknown; insight?: unknown; keywords?: unknown }
      | null;
    if (!parsed || typeof parsed.insight !== "string" || !parsed.insight.trim()) {
      console.error("extractAndStore: parse failed or empty insight", raw);
      return;
    }
    const rec: LearnedKnowledge = {
      ts,
      type: normalizeType(parsed.type),
      insight: parsed.insight.trim(),
      keywords: normalizeKeywords(parsed.keywords),
      sourceComment: text,
    };
    await appendLearning(env, teamId, rec);
    await addReaction(channel, ts, "white_check_mark", token);
  } catch (err) {
    console.error("extractAndStore error", err);
  }
}

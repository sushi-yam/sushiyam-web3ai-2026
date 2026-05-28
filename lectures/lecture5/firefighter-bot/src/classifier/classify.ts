import type { IncidentType } from "../types";
import { generateText, parseJsonLoose } from "../gemini";

const VALID_TYPES: IncidentType[] = [
  "structure-fire",
  "wildland-fire",
  "vehicle-accident",
  "medical",
  "hazmat",
  "rescue",
  "other",
];

const PROMPT = (text: string) =>
  `次の文章は消防団への出動命令か。出動なら incident_type を1つ選んで JSON で返す。type候補: structure-fire, wildland-fire, vehicle-accident, medical, hazmat, rescue, other。出動でなければ null。フォーマット: {"type":"structure-fire"} か {"type":null}\n\n文章:\n${text}`;

export async function classifyType(text: string, apiKey: string): Promise<IncidentType> {
  try {
    const out = await generateText(PROMPT(text), apiKey);
    const parsed = parseJsonLoose(out) as { type?: string | null } | null;
    if (!parsed) return "other";
    const t = parsed.type;
    if (t === null || t === undefined) return "other";
    if (typeof t !== "string") return "other";
    if ((VALID_TYPES as string[]).includes(t)) return t as IncidentType;
    return "other";
  } catch (err) {
    console.error("classifyType error", err);
    return "other";
  }
}

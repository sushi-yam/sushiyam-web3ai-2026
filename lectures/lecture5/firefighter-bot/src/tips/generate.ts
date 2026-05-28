import type { IncidentType, LocationPreset, LearnedKnowledge } from "../types";
import { generateText } from "../gemini";
import { DISCLAIMER, dispatchTipPrompt, seasonalTipPrompt } from "./prompts";
import { getSeasonalCategories } from "./season";

export async function tipForDispatch(args: {
  type: IncidentType;
  preset: LocationPreset;
  learnings: LearnedKnowledge[];
  apiKey: string;
}): Promise<string> {
  const prompt = dispatchTipPrompt({
    type: args.type,
    preset: args.preset,
    learnings: args.learnings,
  });
  const tip = await generateText(prompt, args.apiKey);
  return `${tip}${DISCLAIMER}`;
}

export async function seasonalTip(args: {
  preset: LocationPreset;
  month: number;
  apiKey: string;
}): Promise<string> {
  const cats = getSeasonalCategories(args.preset.climate, args.month);
  const category = cats[0];
  const prompt = seasonalTipPrompt({
    preset: args.preset,
    month: args.month,
    category,
  });
  const tip = await generateText(prompt, args.apiKey);
  return `💭 シーズンリコール: ${tip}${DISCLAIMER}`;
}

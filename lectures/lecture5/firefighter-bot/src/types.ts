export type ClimateTag =
  | "high-desert"
  | "coastal-temperate"
  | "alpine"
  | "wildland-urban-interface";

export type TerrainTag =
  | "plateau-canyon"
  | "flat-urban"
  | "forested-mountain"
  | "mixed-suburban";

export type IncidentType =
  | "structure-fire"
  | "wildland-fire"
  | "vehicle-accident"
  | "medical"
  | "hazmat"
  | "rescue"
  | "other";

export interface LocationPreset {
  id: string;
  label: string;
  climate: ClimateTag;
  terrain: TerrainTag;
  elevationFt: number;
  notes: string;
}

export interface DispatchEvent {
  ts: string;
  channel: string;
  text: string;
  type: IncidentType;
}

export interface LearnedKnowledge {
  ts: string;
  type: IncidentType;
  insight: string;
  keywords: string[];
  sourceComment: string;
}

export interface Env {
  RECALL_KV: KVNamespace;
  SLACK_BOT_TOKEN: string;
  SLACK_SIGNING_SECRET: string;
  GEMINI_API_KEY: string;
}

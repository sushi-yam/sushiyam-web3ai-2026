import type { ClimateTag, IncidentType } from "../types";

type Season = "winter" | "spring" | "summer" | "fall";

function monthToSeason(month: number): Season {
  if (month === 12 || month === 1 || month === 2) return "winter";
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  return "fall";
}

const TABLE: Record<ClimateTag, Record<Season, IncidentType[]>> = {
  "high-desert": {
    winter: ["structure-fire", "vehicle-accident"],
    spring: ["wildland-fire", "rescue"],
    summer: ["wildland-fire", "medical"],
    fall: ["wildland-fire", "vehicle-accident"],
  },
  "coastal-temperate": {
    winter: ["rescue", "vehicle-accident"],
    spring: ["medical", "structure-fire"],
    summer: ["medical", "rescue"],
    fall: ["rescue", "structure-fire"],
  },
  alpine: {
    winter: ["rescue", "vehicle-accident"],
    spring: ["rescue", "wildland-fire"],
    summer: ["wildland-fire", "medical"],
    fall: ["wildland-fire", "structure-fire"],
  },
  "wildland-urban-interface": {
    winter: ["structure-fire", "medical"],
    spring: ["wildland-fire", "structure-fire"],
    summer: ["wildland-fire", "rescue"],
    fall: ["wildland-fire", "structure-fire"],
  },
};

export function getSeasonalCategories(climate: ClimateTag, month: number): IncidentType[] {
  const season = monthToSeason(month);
  const cats = TABLE[climate]?.[season];
  if (cats && cats.length > 0) return cats;
  return ["other"];
}

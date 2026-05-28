import type { LocationPreset } from "../types";

export const PRESETS: LocationPreset[] = [
  {
    id: "high-desert-plateau",
    label: "高地砂漠/キャニオン",
    climate: "high-desert",
    terrain: "plateau-canyon",
    elevationFt: 4300,
    notes: "乾燥・強風・無線通じにくいキャニオン地形・水源遠い・植生はセージ/ジュニパー",
  },
  {
    id: "coastal-temperate",
    label: "沿岸温帯/市街",
    climate: "coastal-temperate",
    terrain: "flat-urban",
    elevationFt: 50,
    notes: "湿度高・建物密集・水源豊富・暴風雨時の救助多い",
  },
  {
    id: "alpine-forest",
    label: "山岳森林/高標高",
    climate: "alpine",
    terrain: "forested-mountain",
    elevationFt: 7000,
    notes: "冬季雪崩・春は雪解け増水・夏季落雷からの森林火災・道路アクセス難",
  },
  {
    id: "wui-suburban",
    label: "WUI都市近郊",
    climate: "wildland-urban-interface",
    terrain: "mixed-suburban",
    elevationFt: 1500,
    notes: "住宅地と植生の境界・延焼リスク・避難動線確保が鍵",
  },
];

export function getPreset(id: string): LocationPreset | undefined {
  return PRESETS.find((p) => p.id === id);
}

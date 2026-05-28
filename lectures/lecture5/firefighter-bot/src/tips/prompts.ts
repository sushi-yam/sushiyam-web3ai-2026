import type { IncidentType, LocationPreset, LearnedKnowledge } from "../types";

export const DISCLAIMER =
  "\n\n⚠️ これは個人の訓練想起補助です。公式の指揮命令・SOP・マニュアルの代替ではありません。";

export function dispatchTipPrompt(args: {
  type: IncidentType;
  preset: LocationPreset;
  learnings: LearnedKnowledge[];
}): string {
  const { type, preset, learnings } = args;
  const hasLearnings = learnings.length > 0;
  const learningBlock = hasLearnings
    ? learnings.map((l) => `- ${l.insight}`).join("\n")
    : "(まだ蓄積された学びはありません)";

  const priorityRule = hasLearnings
    ? `**最重要ルール**: 下記「過去の訓練からの学び」の中に、この出動タイプ・地域特性に関連するものがあれば、その内容を最優先で反映した tip を返してください。学びが手順・操作・装備の使い方に関するものなら、その具体的な手順や数値を 1 文に凝縮して返す。学びが直接関係しないと判断した場合のみ、一般的な命綱 tip を返す。`
    : `この出動タイプと地域特性で「今この 1 つだけ覚えていれば命を守れる」最重要 tip を返してください。`;

  return `あなたは消防団のベテランです。出動命令タイプ「${type}」に対し、訓練したことを出動の瞬間に思い出させるための tip を **1 文・40 文字以内** で日本語で返答してください。説明・前置き・絵文字なし、結論のみ。

${priorityRule}

地域特性: ${preset.label} — ${preset.notes}

過去の訓練からの学び:
${learningBlock}

形式: 1 文のみ、40 文字以内。`;
}

export function seasonalTipPrompt(args: {
  preset: LocationPreset;
  month: number;
  category: IncidentType;
}): string {
  const { preset, month, category } = args;
  return `${preset.label} で ${month}月に多い「${category}」出動に備えて、今のうちに思い出しておくべき最重要ポイントを **1文・60文字以内** で日本語で。前置きなし、結論のみ。`;
}

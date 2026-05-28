# 第5回課題 — プロトタイプ v1: 出動リコール Bot

| 項目 | 内容 |
|---|---|
| 受講生 | sushiyam |
| Discord ID | `sushiyam` |
| GitHub | https://github.com/sushi-yam/sushiyam-web3ai-2026 |
| プロダクト | 出動リコール Bot (Dispatch Recall Bot) |
| 種別 | 動く Slack Bot (Cloudflare Workers) |
| ベースになった VPC | [lecture3/vpc-v1.md](../lecture3/vpc-v1.md) |
| Discord 投稿リンク | _(投稿後にここに貼る)_ |

> ⚠️ **安全性に関する免責**
> これは個人の訓練リコール補助であり、正式な指揮系統・標準手順・公式マニュアルを置き換えるものではありません。緊急時の判断は必ず指揮者・公式手順に従ってください。

---

## ステータス

- [x] VPC v1 を再確認 ([lecture3/vpc-v1.md](../lecture3/vpc-v1.md))
- [x] 最小スコープを決定
- [x] アーキテクチャ設計
- [x] プロトタイプ実装 ([firefighter-bot/](./firefighter-bot/))
- [x] セットアップ手順 ([firefighter-bot/README.md](./firefighter-bot/README.md))
- [ ] Cloudflare Workers にデプロイ
- [ ] Slack ワークスペースで動作確認
- [ ] Discord に投稿

---

## コンセプト (3行で)

- **何のバグ**: 出動の瞬間、過去に訓練した手順が思い出せない
- **誰のため**: 本業を別に持ちながら参加している消防団・ボランティア消防のメンバー
- **どう解決**: 出動命令の文章を Slack が拾った瞬間、Bot が「今回1番大事なこと」を1つだけ返信。訓練の写真+メモを学習して、次回同種の出動でその知見をリコールに混ぜる。

---

## なぜプロトタイプを「動く Slack Bot」にしたか

VPC v1 ([lecture3/vpc-v1.md](../lecture3/vpc-v1.md)) で定義した:

- **★Pain Reliever**: 現場タイプ別「今回の手順チェックリスト」を1画面で即表示
- **★Gain Creator**: 訓練するたびに1行記録 → 累積、現場タイプ別の訓練回数・最終訓練日が見える

これを最小コストで「動く」状態にするには、消防団がすでに使っている Slack に乗せるのが一番早い。新しいアプリをインストールさせない。Web 画面も作らない。Slack のチャンネルに出動命令が流れたら反射的に返信する、それだけ。

「1画面」を「1つの Slack メッセージ」に置き換えた v1。

---

## 機能 (v1 で動くもの)

1. **出動時の即時リコール** — チャンネルに出動命令らしき文章が流れたら、Bot がスレッドに「今回 1 番大事なこと」を 1 文だけ返信
2. **訓練の学習** — メンバーが写真 (例: ポンプ設定) + コメントを投稿すると、Gemini が「次回同種の出動で最重要な教訓」を抽出して保存
3. **学習の活用** — 次に類似の出動命令が流れた時、保存された教訓が tip に反映される
4. **シーズンリコール** — 10日に1回、選択中のロケーション(気候+地形) と現在の季節から、起こりやすい出動タイプを予測して「思い出そう」tip を投稿
5. **ロケーション選択** — `/firefighter-location` スラッシュコマンドで気候+地形プリセットを選択。実在の地名は明かさない (本当の場所は4つあるプリセットのうちの1つ)

---

## ロケーション秘匿について

実在の消防団の場所を保護するため、Bot は「気候 × 地形」のプリセットのみを使う:

- 西部高地砂漠・台地キャニオン (4000ft+)
- 沿岸温帯・平地市街
- 山岳森林・高標高 (6000ft+)
- 都市近郊・植生境界 (WUI)

ユーザーがプリセットを選択すると、その気候パターンに基づく季節予測のみが Bot に渡される。実際の地名・座標・チーム名は Bot 内に存在しない。

---

## 技術構成

- **ランタイム**: Cloudflare Workers (TypeScript)
- **ストレージ**: Cloudflare KV (JSON 値)
- **AI**: Gemini API (`gemini-2.0-flash`, テキスト+画像マルチモーダル)
- **Slack**: Events API + 生 HMAC-SHA256 検証 + slash command + interactions
- **スケジューラ**: Cloudflare Cron Triggers (10日に1回)

設計の詳細は [firefighter-bot/README.md](./firefighter-bot/README.md) を参照。

---

## ファイル

| ファイル | 内容 |
|---|---|
| [my-prototype.md](./my-prototype.md) | Discord 投稿用の3行テンプレ |
| [firefighter-bot/](./firefighter-bot/) | Cloudflare Workers のプロジェクト本体 |
| [firefighter-bot/README.md](./firefighter-bot/README.md) | セットアップ・デプロイ手順 |

`ASSIGNMENT.md` は個人ブリーフのため `.gitignore` に入っています (lecture3 と同様)。

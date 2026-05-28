# 出動リコール Bot

消防団員のための「訓練したことを、出動の瞬間に思い出すための」Slack Bot。Cloudflare Workers + Gemini で動く軽量プロトタイプ。

## 概要

- 出動命令らしき投稿を検知 → 地域特性と過去の学びを織り込んだ **1文・40字以内** の最重要 tip をスレッドに返す
- 訓練の写真+コメントを投稿 → Gemini が教訓を抽出し、出動タイプ別に KV に蓄積
- 10日に1回、季節と地域に応じた「思い出しておくべきポイント」を通知 (シーズンリコール)

## 必要なもの

- Cloudflare アカウント (Workers + KV 無料枠で動きます)
- Slack ワークスペース (テスト用で OK)
- Gemini API key (Google AI Studio で無料発行: https://aistudio.google.com/app/apikey)
- Node.js 20+
- npm

## セットアップ手順

```bash
cd lectures/lecture5/firefighter-bot
npm install
```

### 1. Cloudflare ログイン

```bash
npx wrangler login
```

### 2. KV namespace 作成

```bash
npx wrangler kv namespace create RECALL_KV
```

出力された `id = "..."` を `wrangler.toml` の `REPLACE_WITH_KV_ID` に貼り替える。

### 3. Slack App 作成

1. https://api.slack.com/apps → **Create New App** → **From an app manifest**
2. ワークスペースを選択
3. `slack-manifest.yaml` を開き、3か所の `YOUR-WORKER.workers.dev` を **これから deploy する Worker の URL** に書き換える (Worker 名 `firefighter-bot` なら `firefighter-bot.<your-subdomain>.workers.dev`)
4. YAML を貼り付けて Create
5. **Install to Workspace** → Bot User OAuth Token (`xoxb-...`) を控える
6. **Basic Information** → Signing Secret を控える

### 4. シークレット登録

```bash
npx wrangler secret put SLACK_BOT_TOKEN
# → xoxb-... を貼る

npx wrangler secret put SLACK_SIGNING_SECRET
# → Signing Secret を貼る

npx wrangler secret put GEMINI_API_KEY
# → Gemini の API key を貼る
```

### 5. Deploy

```bash
npm run deploy
```

Worker の URL が出力される。Slack App の manifest の URL とこれが一致していることを確認。違えば manifest を直して再保存し、Slack 側で **Reinstall App** する。

### 6. チャンネルに招待 & 設定

```
/invite @出動リコール
/firefighter-location    ← プリセットボタンから1つ選ぶ
/firefighter-channel     ← 通知先をこのチャンネルに固定
```

## 動作確認

- チャンネルに「出動要請: 住宅火災発生」のように投稿 → Bot がスレッドに tip を返す
- 訓練写真をコメント付きで投稿 → Bot が ✅ リアクションを付け、教訓を裏で蓄積
- シーズンリコールは cron (10日に1回) で自動投下

ローカル開発:

```bash
cp .dev.vars.example .dev.vars
# .dev.vars に実際の値を書く
npm run dev
```

`wrangler dev` のトンネル URL を Slack App の Event/Interaction/Command URL に一時的に設定すれば、ローカルで全フローをテストできる。

## 安全性に関する免責

このBotは個人の訓練想起補助です。出力された tip は **公式の指揮命令・SOP・マニュアル・現場指揮官の判断の代替ではありません**。LLM は誤った情報を生成する可能性があります。実際の出動時は組織の手順と指揮命令に従ってください。

## ロケーション秘匿の方針

具体的な町名・住所・GPS座標などは一切保存しません。気候タグ (`high-desert` 等) と地形タグ (`plateau-canyon` 等) と概算標高のみを保持し、それを使って tip の地域適合性を上げます。プリセットは4種類から選ぶだけで、自由入力欄はありません。

## ファイル構成

```
src/
├── index.ts            ルーター + scheduled handler
├── types.ts            共有型
├── slack/              署名検証・API クライアント
├── storage/            Cloudflare KV ラッパー
├── presets/            4つの気候+地形プリセット
├── gemini/             Gemini API クライアント + JSON ローダー
├── classifier/         キーワード判定 + LLM 出動タイプ分類
├── tips/               プロンプト + シーズン表 + tip 生成
└── learning/           写真+コメント → 教訓抽出
```

各サブディレクトリは `index.ts` で公開コントラクトだけを再エクスポートする「ブリック」構造。

import type { Env, IncidentType, DispatchEvent } from "./types";
import * as slack from "./slack";
import * as storage from "./storage";
import * as presets from "./presets";
import * as classifier from "./classifier";
import * as tips from "./tips";
import * as learning from "./learning";

function jsonResponse(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function textResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function locationPickerBlocks(): unknown {
  return {
    response_type: "ephemeral",
    text: "ロケーション(気候+地形)を選択してください。",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*ロケーション(気候+地形)を選択してください。*\n地域名は保存されません。気候タグと地形タグのみ保持します。",
        },
      },
      {
        type: "actions",
        elements: presets.PRESETS.map((p) => ({
          type: "button",
          text: { type: "plain_text", text: p.label, emoji: true },
          action_id: `set_location:${p.id}`,
          value: p.id,
        })),
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "このチャンネルを通知先にする", emoji: true },
            action_id: "set_channel_here",
            style: "primary",
            value: "set_channel",
          },
        ],
      },
    ],
  };
}

async function handleSlackEvents(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const rawBody = await req.text();
  const ok = await slack.verifySignature(req, env.SLACK_SIGNING_SECRET, rawBody);
  if (!ok) return textResponse("invalid signature", 401);

  let payload: slack.SlackEventPayload;
  try {
    payload = slack.parseEvent(rawBody);
  } catch {
    return textResponse("bad json", 400);
  }

  if (payload.type === "url_verification") {
    return jsonResponse({ challenge: payload.challenge });
  }

  // Ack immediately, process in background.
  ctx.waitUntil(handleEvent(payload, env).catch((err) => console.error("handleEvent error", err)));
  return textResponse("ok");
}

async function handleEvent(payload: slack.SlackEventPayload, env: Env): Promise<void> {
  const teamId = payload.team_id;
  if (!teamId) return;
  const inner = payload.event;
  if (!inner || inner.type !== "message") return;
  const ev = inner as slack.SlackMessageEvent;
  if (ev.subtype === "bot_message" || ev.bot_id) return;

  // Set channel context if not set yet.
  const knownChannel = await storage.getChannel(env, teamId);
  if (!knownChannel) {
    await storage.setChannel(env, teamId, ev.channel);
  }

  // Photo + comment → learning extraction.
  if (ev.files && ev.files.length > 0) {
    const f = ev.files[0];
    const fileUrl = f.url_private_download || f.url_private;
    if (fileUrl) {
      await learning.extractAndStore({
        env,
        teamId,
        channel: ev.channel,
        ts: ev.ts,
        text: ev.text || "",
        fileUrl,
        mimeType: f.mimetype,
        token: env.SLACK_BOT_TOKEN,
        apiKey: env.GEMINI_API_KEY,
      });
    }
    return;
  }

  // Text-only dispatch command path.
  const text = ev.text || "";
  if (!classifier.isDispatch(text)) return;

  const type: IncidentType = await classifier.classifyType(text, env.GEMINI_API_KEY);

  const dispatchEv: DispatchEvent = {
    ts: ev.ts,
    channel: ev.channel,
    text,
    type,
  };
  await storage.appendDispatch(env, teamId, dispatchEv);

  const presetId = await storage.getLocation(env, teamId);
  const preset = presetId ? presets.getPreset(presetId) : undefined;
  if (!preset) {
    await slack.postMessage(
      ev.channel,
      "ロケーションが未設定です。 `/firefighter-location` で気候+地形プリセットを選んでください。",
      env.SLACK_BOT_TOKEN,
      ev.ts,
    );
    return;
  }

  const learnings = await storage.listLearningsByType(env, teamId, type);
  const tip = await tips.tipForDispatch({
    type,
    preset,
    learnings,
    apiKey: env.GEMINI_API_KEY,
  });
  await slack.postMessage(ev.channel, tip, env.SLACK_BOT_TOKEN, ev.ts);
}

async function handleSlashCommand(req: Request, env: Env): Promise<Response> {
  const rawBody = await req.text();
  const ok = await slack.verifySignature(req, env.SLACK_SIGNING_SECRET, rawBody);
  if (!ok) return textResponse("invalid signature", 401);

  const params = new URLSearchParams(rawBody);
  const command = params.get("command") || "";
  const teamId = params.get("team_id") || "";
  const channelId = params.get("channel_id") || "";
  const userId = params.get("user_id") || "";

  if (!teamId) return textResponse("missing team_id", 400);

  if (command === "/firefighter-location") {
    return jsonResponse(locationPickerBlocks());
  }

  if (command === "/firefighter-channel") {
    if (!channelId) return textResponse("missing channel", 400);
    await storage.setChannel(env, teamId, channelId);
    return jsonResponse({
      response_type: "ephemeral",
      text: `✅ このチャンネルを通知先に設定しました。\n(user: <@${userId}>)`,
    });
  }

  return jsonResponse({ response_type: "ephemeral", text: "unknown command" });
}

async function postResponseUrl(responseUrl: string, body: unknown): Promise<void> {
  try {
    await fetch(responseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("response_url post failed", err);
  }
}

async function handleInteractions(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const rawBody = await req.text();
  const ok = await slack.verifySignature(req, env.SLACK_SIGNING_SECRET, rawBody);
  if (!ok) return textResponse("invalid signature", 401);

  const params = new URLSearchParams(rawBody);
  const payloadStr = params.get("payload");
  if (!payloadStr) return textResponse("missing payload", 400);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: any;
  try {
    payload = JSON.parse(payloadStr);
  } catch {
    return textResponse("bad payload json", 400);
  }

  const teamId: string | undefined = payload?.team?.id;
  const channelId: string | undefined = payload?.channel?.id;
  const responseUrl: string | undefined = payload?.response_url;
  if (!teamId) return textResponse("missing team", 400);

  const actions: Array<{ action_id?: string; value?: string }> = payload?.actions || [];
  console.log("interaction actions:", JSON.stringify(actions));
  for (const a of actions) {
    const actionId = a.action_id || "";
    console.log("processing actionId:", actionId);
    if (actionId.startsWith("set_location:")) {
      const presetId = actionId.slice("set_location:".length);
      const preset = presets.getPreset(presetId);
      console.log("preset lookup:", presetId, "found:", !!preset);
      if (preset) {
        await storage.setLocation(env, teamId, presetId);
        if (responseUrl) {
          ctx.waitUntil(
            postResponseUrl(responseUrl, {
              response_type: "ephemeral",
              replace_original: true,
              text: `✅ ロケーションを設定しました: *${preset.label}*\n(地名は保存していません。気候/地形タグのみ保持。)`,
            }),
          );
        }
        return new Response("", { status: 200 });
      }
    } else if (actionId === "set_channel_here") {
      if (!channelId) return textResponse("missing channel", 400);
      await storage.setChannel(env, teamId, channelId);
      if (responseUrl) {
        ctx.waitUntil(
          postResponseUrl(responseUrl, {
            response_type: "ephemeral",
            replace_original: true,
            text: "✅ このチャンネルを通知先に設定しました。",
          }),
        );
      }
      return new Response("", { status: 200 });
    }
  }

  console.log("no matching action_id, returning no-op");
  return new Response("", { status: 200 });
}

async function handleScheduled(env: Env): Promise<void> {
  const teamIds = await storage.listTeams(env);
  const month = new Date().getUTCMonth() + 1;
  for (const teamId of teamIds) {
    try {
      const presetId = await storage.getLocation(env, teamId);
      const channel = await storage.getChannel(env, teamId);
      if (!presetId || !channel) continue;
      const preset = presets.getPreset(presetId);
      if (!preset) continue;
      const tip = await tips.seasonalTip({
        preset,
        month,
        apiKey: env.GEMINI_API_KEY,
      });
      await slack.postMessage(channel, tip, env.SLACK_BOT_TOKEN);
    } catch (err) {
      console.error("scheduled tick error for team", teamId, err);
    }
  }
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === "POST" && url.pathname === "/slack/events") {
      return handleSlackEvents(req, env, ctx);
    }
    if (req.method === "POST" && url.pathname === "/slack/commands") {
      return handleSlashCommand(req, env);
    }
    if (req.method === "POST" && url.pathname === "/slack/interactions") {
      return handleInteractions(req, env, ctx);
    }
    if (req.method === "GET" && url.pathname === "/") {
      return textResponse(
        "出動リコール Bot is running.\n\nendpoints:\n  POST /slack/events\n  POST /slack/commands\n  POST /slack/interactions\n",
      );
    }
    return textResponse("not found", 404);
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduled(env));
  },
};

export interface SlackFile {
  id: string;
  name?: string;
  mimetype?: string;
  url_private?: string;
  url_private_download?: string;
}

export interface SlackMessageEvent {
  type: "message";
  subtype?: string;
  bot_id?: string;
  user?: string;
  text?: string;
  ts: string;
  channel: string;
  thread_ts?: string;
  files?: SlackFile[];
}

export type SlackInnerEvent = SlackMessageEvent | { type: string; [k: string]: unknown };

export interface SlackEventPayload {
  type: "event_callback" | "url_verification" | string;
  token?: string;
  team_id?: string;
  challenge?: string;
  event?: SlackInnerEvent;
}

export type SlackEvent = SlackEventPayload;

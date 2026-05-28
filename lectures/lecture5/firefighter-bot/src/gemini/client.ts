const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(slice));
  }
  return btoa(binary);
}

// Gemini response shapes are loosely typed; we narrow defensively.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractText(json: any): string {
  const parts = json?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  const texts: string[] = [];
  for (const p of parts) {
    if (typeof p?.text === "string") texts.push(p.text);
  }
  return texts.join("").trim();
}

export async function generateText(prompt: string, apiKey: string): Promise<string> {
  const url = `${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini generateText failed: ${res.status} ${t}`);
  }
  const json = await res.json();
  return extractText(json);
}

export async function analyzeImage(
  imageBytes: ArrayBuffer,
  mimeType: string,
  prompt: string,
  apiKey: string,
): Promise<string> {
  const b64 = arrayBufferToBase64(imageBytes);
  const url = `${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inline_data: { mime_type: mimeType, data: b64 } },
            { text: prompt },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini analyzeImage failed: ${res.status} ${t}`);
  }
  const json = await res.json();
  return extractText(json);
}

export function parseJsonLoose(s: string): unknown | null {
  if (!s) return null;
  let trimmed = s.trim();
  const fenceRe = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;
  const m = trimmed.match(fenceRe);
  if (m) trimmed = m[1].trim();
  // Try direct parse first.
  try {
    return JSON.parse(trimmed);
  } catch {
    /* try extracting first {...} block */
  }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) {
    const candidate = trimmed.slice(first, last + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }
  return null;
}

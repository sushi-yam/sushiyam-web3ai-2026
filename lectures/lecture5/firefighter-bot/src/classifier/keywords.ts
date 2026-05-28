const KEYWORDS_LC_ASCII = ["dispatch", "119"];
const KEYWORDS_LITERAL = ["出動", "火災", "救急", "事故", "🚒", "🚑", "通報", "要請"];

export function isDispatch(text: string): boolean {
  if (!text) return false;
  const lc = text.toLowerCase();
  for (const k of KEYWORDS_LC_ASCII) {
    if (lc.includes(k)) return true;
  }
  for (const k of KEYWORDS_LITERAL) {
    if (text.includes(k)) return true;
  }
  return false;
}

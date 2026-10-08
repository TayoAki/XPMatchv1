/**
 * A country's flag for a place line ("Tokyo, Japan" → 🇯🇵), from the last part of the line.
 * The country names come from the browser's own region names, so no list is kept here.
 */

const ALIASES: Record<string, string> = { usa: "US", "united states of america": "US", uk: "GB", "great britain": "GB", england: "GB", scotland: "GB", wales: "GB", "south korea": "KR", "north korea": "KP", russia: "RU", "czech republic": "CZ", turkey: "TR", "türkiye": "TR" };

let byName: Map<string, string> | null = null;

function countryCodes(): Map<string, string> {
  if (byName) return byName;
  byName = new Map();
  try {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (const a of letters) {
      for (const b of letters) {
        const code = a + b;
        const name = names.of(code);
        if (name && name !== code) byName.set(name.toLowerCase(), code);
      }
    }
  } catch {
    // No region names in this runtime: no flags.
  }
  return byName;
}

export function countryCode(placeLine: string): string | null {
  const last = placeLine.split(",").map((s) => s.trim()).filter(Boolean).pop()?.toLowerCase();
  if (!last) return null;
  if (ALIASES[last]) return ALIASES[last];
  return countryCodes().get(last) ?? null;
}

/** The flag emoji for the line's country, or null when it names none. */
export function countryFlag(placeLine: string): string | null {
  const code = countryCode(placeLine);
  return code ? String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : null;
}

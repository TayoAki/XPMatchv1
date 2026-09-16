/**
 * Small offline gazetteer. Used when no Places key is configured, and by the
 * demo model to correct typos ("roam" → Rome) the way a real model would.
 */
export interface GazetteerCity {
  name: string;
  country: string;
  lat: number;
  lng: number;
  aliases?: string[];
}

export const GAZETTEER: GazetteerCity[] = [
  { name: "Rome", country: "Italy", lat: 41.9028, lng: 12.4964, aliases: ["roma"] },
  { name: "Paris", country: "France", lat: 48.8566, lng: 2.3522 },
  { name: "London", country: "United Kingdom", lat: 51.5072, lng: -0.1276 },
  { name: "Lisbon", country: "Portugal", lat: 38.7223, lng: -9.1393, aliases: ["lisboa"] },
  { name: "Barcelona", country: "Spain", lat: 41.3874, lng: 2.1686 },
  { name: "Madrid", country: "Spain", lat: 40.4168, lng: -3.7038 },
  { name: "Amsterdam", country: "Netherlands", lat: 52.3676, lng: 4.9041 },
  { name: "Berlin", country: "Germany", lat: 52.52, lng: 13.405 },
  { name: "Prague", country: "Czechia", lat: 50.0755, lng: 14.4378 },
  { name: "Vienna", country: "Austria", lat: 48.2082, lng: 16.3738 },
  { name: "Athens", country: "Greece", lat: 37.9838, lng: 23.7275 },
  { name: "Santorini", country: "Greece", lat: 36.3932, lng: 25.4615 },
  { name: "Istanbul", country: "Türkiye", lat: 41.0082, lng: 28.9784 },
  { name: "Marrakech", country: "Morocco", lat: 31.6295, lng: -7.9811, aliases: ["marrakesh"] },
  { name: "Cape Town", country: "South Africa", lat: -33.9249, lng: 18.4241 },
  { name: "Dubai", country: "United Arab Emirates", lat: 25.2048, lng: 55.2708 },
  { name: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503 },
  { name: "Kyoto", country: "Japan", lat: 35.0116, lng: 135.7681 },
  { name: "Bangkok", country: "Thailand", lat: 13.7563, lng: 100.5018 },
  { name: "Singapore", country: "Singapore", lat: 1.3521, lng: 103.8198 },
  { name: "Bali", country: "Indonesia", lat: -8.4095, lng: 115.1889 },
  { name: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093 },
  { name: "Mexico City", country: "Mexico", lat: 19.4326, lng: -99.1332, aliases: ["cdmx"] },
  { name: "Cancún", country: "Mexico", lat: 21.1619, lng: -86.8515, aliases: ["cancun"] },
  { name: "Banff", country: "Canada", lat: 51.1784, lng: -115.5708 },
  { name: "Vancouver", country: "Canada", lat: 49.2827, lng: -123.1207 },
  { name: "Toronto", country: "Canada", lat: 43.6532, lng: -79.3832 },
  { name: "Reykjavik", country: "Iceland", lat: 64.1466, lng: -21.9426 },
  { name: "New York", country: "United States", lat: 40.7128, lng: -74.006, aliases: ["nyc", "new york city"] },
  { name: "Los Angeles", country: "United States", lat: 34.0522, lng: -118.2437, aliases: ["la"] },
  { name: "San Francisco", country: "United States", lat: 37.7749, lng: -122.4194 },
  { name: "Chicago", country: "United States", lat: 41.8781, lng: -87.6298 },
  { name: "Miami", country: "United States", lat: 25.7617, lng: -80.1918 },
  { name: "Atlanta", country: "United States", lat: 33.749, lng: -84.388 },
  { name: "Austell", country: "United States", lat: 33.8126, lng: -84.6344 },
  { name: "Dallas", country: "United States", lat: 32.7767, lng: -96.797 },
  { name: "Austin", country: "United States", lat: 30.2672, lng: -97.7431 },
  { name: "Houston", country: "United States", lat: 29.7604, lng: -95.3698 },
  { name: "New Orleans", country: "United States", lat: 29.9511, lng: -90.0715 },
  { name: "Nashville", country: "United States", lat: 36.1627, lng: -86.7816 },
  { name: "Las Vegas", country: "United States", lat: 36.1699, lng: -115.1398 },
  { name: "Seattle", country: "United States", lat: 47.6062, lng: -122.3321 },
  { name: "Denver", country: "United States", lat: 39.7392, lng: -104.9903 },
  { name: "Honolulu", country: "United States", lat: 21.3069, lng: -157.8583 },
  { name: "Washington, D.C.", country: "United States", lat: 38.9072, lng: -77.0369, aliases: ["washington", "dc"] },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-zÀ-ɏ ]/g, "").trim();

export function findCity(query: string): GazetteerCity | null {
  const q = norm(query.split(",")[0] ?? query);
  if (!q) return null;
  return (
    GAZETTEER.find((c) => norm(c.name) === q || c.aliases?.some((a) => norm(a) === q)) ??
    GAZETTEER.find((c) => q.startsWith(norm(c.name)) || norm(c.name).startsWith(q)) ??
    null
  );
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

/** Exact or close (typo-tolerant) city match, e.g. "roam" → Rome. */
export function fuzzyCity(word: string): GazetteerCity | null {
  const exact = findCity(word);
  if (exact) return exact;
  const q = norm(word);
  if (q.length < 4) return null;
  let best: { city: GazetteerCity; d: number } | null = null;
  for (const city of GAZETTEER) {
    const candidates = [norm(city.name), ...(city.aliases ?? []).map(norm)];
    for (const c of candidates) {
      const d = levenshtein(q, c);
      if (d <= 2 && (!best || d < best.d)) best = { city, d };
    }
  }
  return best?.city ?? null;
}

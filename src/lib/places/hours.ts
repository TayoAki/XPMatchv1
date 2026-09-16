/** The line of Google's weekly hours for today ("Monday: 8:30 AM–7:15 PM" → "8:30 AM–7:15 PM"). */
export function todaysHours(hours: string[] | undefined, now = new Date()): string | null {
  if (!hours?.length) return null;
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
  const line = hours.find((h) => h.toLowerCase().startsWith(weekday.toLowerCase()));
  return line ? line.replace(/^[^:]+:\s*/, "") : null;
}

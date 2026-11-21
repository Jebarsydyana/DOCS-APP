const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
const relativeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "just now", "5 minutes ago", "yesterday", or a date for anything older than a week. */
export function formatUpdated(date: Date, now: Date = new Date()): string {
  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSeconds);

  if (abs < 60) return "just now";
  if (abs < 3600) return relativeFormat.format(Math.round(diffSeconds / 60), "minute");
  if (abs < 86400) return relativeFormat.format(Math.round(diffSeconds / 3600), "hour");
  if (abs < 86400 * 7) return relativeFormat.format(Math.round(diffSeconds / 86400), "day");
  return dateFormat.format(date);
}

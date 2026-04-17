// Relative date resolution for demo copy. Prevents "this Thursday" from
// drifting into the past. Called at render time so dates always feel fresh.
//
// Usage:
//   import { resolveRelativeDate } from "/demo/_shell/date-helpers.js";
//   resolveRelativeDate("next-thursday-2pm");  // -> "Thursday, April 23 at 2:00 PM CT"

const WEEKDAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function nextWeekday(targetDow, hour = 14, minute = 0, minDaysOut = 2) {
  const now = new Date();
  const d = new Date(now);
  d.setHours(hour, minute, 0, 0);
  // Walk forward until we hit targetDow and are at least minDaysOut away.
  let daysAdded = 0;
  while (d.getDay() !== targetDow || (d.getTime() - now.getTime()) < minDaysOut * 24 * 3600 * 1000) {
    d.setDate(d.getDate() + 1);
    d.setHours(hour, minute, 0, 0);
    daysAdded++;
    if (daysAdded > 14) break; // safety
  }
  return d;
}

function formatDate(d, opts = {}) {
  const weekday = WEEKDAY_NAMES[d.getDay()];
  const month = MONTH_NAMES[d.getMonth()];
  const day = d.getDate();
  const h24 = d.getHours();
  const h12 = ((h24 + 11) % 12) + 1;
  const ampm = h24 >= 12 ? "PM" : "AM";
  const minute = String(d.getMinutes()).padStart(2, "0");
  const time = `${h12}:${minute} ${ampm}`;
  if (opts.short) return `${weekday} at ${time}`;
  return `${weekday}, ${month} ${day} at ${time} CT`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export function resolveRelativeDate(key) {
  switch (key) {
    case "next-thursday-2pm":
      return formatDate(nextWeekday(4, 14, 0, 2));
    case "next-thursday-2pm-short":
      return formatDate(nextWeekday(4, 14, 0, 2), { short: true });
    case "last-week":
      return formatDate(daysAgo(7), { short: true });
    case "eight-months-ago": {
      const d = new Date();
      d.setMonth(d.getMonth() - 8);
      return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    }
    case "today":
      return formatDate(new Date(), { short: true });
    default:
      return key; // unknown key, return untouched
  }
}

export function resolveTemplate(text) {
  // Replace {{key}} tokens with resolved dates.
  return text.replace(/\{\{([a-z0-9-]+)\}\}/g, (_, key) => resolveRelativeDate(key));
}

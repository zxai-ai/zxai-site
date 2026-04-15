// Availability logic for the Front Desk demo.
// Katie gets a natural-language day window ("Thursday or Friday morning", "next week",
// "tomorrow afternoon"). We map that to an absolute [timeMin, timeMax] in America/Chicago,
// query Google Calendar freeBusy, and return two 15-minute slot suggestions.

import { freebusy, type BusyRange } from "./google-calendar";

export interface Slot {
  id: string;
  label: string;
  iso: string; // start time, ISO with offset
  endIso: string;
}

// Business hours (CT): 9:00 - 17:00, Mon-Fri.
const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 17;
const SLOT_MINUTES = 15;

function nowCT(): Date {
  // Return a Date whose UTC fields represent the current wall-clock time in America/Chicago.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return new Date(
    Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"))
  );
}

// Offset in minutes between CT and UTC, using the browser/runtime's tz database.
function ctOffsetMinutes(d: Date): number {
  const utc = new Date(d.toISOString());
  const ct = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    timeZoneName: "shortOffset",
  })
    .formatToParts(utc)
    .find((p) => p.type === "timeZoneName")?.value ?? "GMT-6";
  const m = ct.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!m) return -360;
  const sign = m[1] === "+" ? 1 : -1;
  const h = Number(m[2]);
  const mm = Number(m[3] ?? "0");
  return sign * (h * 60 + mm);
}

// Compose an ISO string for a given Y-M-D H:M interpreted in CT, with the correct offset.
function ctIso(year: number, month: number, day: number, hour: number, minute: number): string {
  // Build a provisional Date in UTC and ask Intl for CT offset.
  const provisional = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offsetMin = ctOffsetMinutes(provisional);
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const oh = String(Math.floor(abs / 60)).padStart(2, "0");
  const om = String(abs % 60).padStart(2, "0");
  const y = String(year);
  const M = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  const H = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return `${y}-${M}-${d}T${H}:${mm}:00${sign}${oh}:${om}`;
}

type DayPart = "morning" | "afternoon" | "any";

interface WindowResolution {
  startIso: string;
  endIso: string;
  label: string;
}

// Parse a free-text day window into an absolute window. Missing-info defaults to next 7 business days.
function resolveWindow(raw: string): WindowResolution {
  const text = (raw ?? "").toLowerCase();
  const now = nowCT();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const date = now.getUTCDate();

  // Determine which day(s) the caller cares about.
  // Strategy: if a specific weekday is mentioned, jump to the next occurrence of that weekday.
  //           if "tomorrow", add 1 day. If "next week", Monday 7-14 days out.
  //           else, open-ended: next 7 business days starting tomorrow.
  const weekdayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const foundWeekday = weekdayNames.findIndex((w) => text.includes(w));

  let startDay = new Date(Date.UTC(year, month - 1, date));
  let windowDays = 7;
  let labelHint = "in the next week";

  if (foundWeekday >= 0) {
    const todayDow = startDay.getUTCDay();
    let delta = (foundWeekday - todayDow + 7) % 7;
    if (delta === 0) delta = 7; // "this Thursday" → the coming Thursday, not today
    startDay = new Date(startDay.getTime() + delta * 86400000);
    windowDays = 1;
    labelHint = weekdayNames[foundWeekday];
  } else if (text.includes("tomorrow")) {
    startDay = new Date(startDay.getTime() + 86400000);
    windowDays = 1;
    labelHint = "tomorrow";
  } else if (text.includes("next week")) {
    const dow = startDay.getUTCDay();
    const daysToMonday = (8 - dow) % 7 || 7;
    startDay = new Date(startDay.getTime() + daysToMonday * 86400000);
    windowDays = 5;
    labelHint = "next week";
  } else if (text.includes("today")) {
    windowDays = 1;
    labelHint = "today";
  } else {
    startDay = new Date(startDay.getTime() + 86400000);
    windowDays = 7;
  }

  const endDay = new Date(startDay.getTime() + windowDays * 86400000);

  const daypart: DayPart = text.includes("morning")
    ? "morning"
    : text.includes("afternoon") || text.includes("evening")
    ? "afternoon"
    : "any";

  const startHour = daypart === "afternoon" ? 12 : BUSINESS_START_HOUR;
  const endHour = daypart === "morning" ? 12 : BUSINESS_END_HOUR;

  const startIso = ctIso(
    startDay.getUTCFullYear(),
    startDay.getUTCMonth() + 1,
    startDay.getUTCDate(),
    startHour,
    0
  );
  const endIso = ctIso(
    endDay.getUTCFullYear(),
    endDay.getUTCMonth() + 1,
    endDay.getUTCDate(),
    endHour,
    0
  );

  return { startIso, endIso, label: `${labelHint} ${daypart === "any" ? "" : daypart}`.trim() };
}

function formatSlotLabel(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d) + " CT";
}

function overlaps(slotStart: Date, slotEnd: Date, busy: BusyRange[]): boolean {
  for (const b of busy) {
    const bs = new Date(b.start).getTime();
    const be = new Date(b.end).getTime();
    if (slotStart.getTime() < be && slotEnd.getTime() > bs) return true;
  }
  return false;
}

// Iterate candidate 15-min slots through the window, pick the first two that are free and
// in business hours (9-17 CT, Mon-Fri).
function pickSlots(window: WindowResolution, busy: BusyRange[], count = 2): Slot[] {
  const out: Slot[] = [];
  let cursor = new Date(window.startIso).getTime();
  const end = new Date(window.endIso).getTime();
  const nowMs = Date.now() + 60 * 60 * 1000; // don't offer slots less than 1 hour out

  while (cursor < end && out.length < count) {
    const s = new Date(cursor);
    const e = new Date(cursor + SLOT_MINUTES * 60000);

    // Check business hours in CT.
    const ctHour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        hour: "2-digit",
        hour12: false,
      }).format(s)
    );
    const ctDow = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      weekday: "short",
    }).format(s);
    const isWeekday = !["Sat", "Sun"].includes(ctDow);
    const inHours = ctHour >= BUSINESS_START_HOUR && ctHour < BUSINESS_END_HOUR;

    if (isWeekday && inHours && s.getTime() > nowMs && !overlaps(s, e, busy)) {
      out.push({
        id: `slot_${s.getTime()}`,
        label: formatSlotLabel(s.toISOString()),
        iso: s.toISOString(),
        endIso: e.toISOString(),
      });
      // Space suggestions out by at least 90 minutes so they feel like real options.
      cursor += 90 * 60000;
    } else {
      cursor += SLOT_MINUTES * 60000;
    }
  }
  return out;
}

export async function resolveAvailability(
  accessToken: string,
  calendarId: string,
  dayWindow: string
): Promise<{ slots: Slot[]; resolvedWindow: string }> {
  const w = resolveWindow(dayWindow);
  const busy = await freebusy(accessToken, calendarId, w.startIso, w.endIso);
  const slots = pickSlots(w, busy, 2);
  return { slots, resolvedWindow: w.label };
}

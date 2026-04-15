// Google Calendar helpers for the Front Desk demo.
// - freebusy(): find open 15-minute windows within a day window
// - insertEvent(): create the consult event with a Google Meet link

export interface BusyRange {
  start: string;
  end: string;
}

export async function freebusy(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<BusyRange[]> {
  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      timeZone: "America/Chicago",
      items: [{ id: calendarId }],
    }),
  });
  if (!res.ok) {
    throw new Error(`freeBusy failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as {
    calendars: Record<string, { busy: BusyRange[] }>;
  };
  return data.calendars[calendarId]?.busy ?? [];
}

export interface CreatedEvent {
  id: string;
  htmlLink: string;
  hangoutLink?: string;
}

export async function insertEvent(
  accessToken: string,
  calendarId: string,
  payload: {
    summary: string;
    description: string;
    startIso: string;
    endIso: string;
    attendeeEmails: string[];
  }
): Promise<CreatedEvent> {
  const body = {
    summary: payload.summary,
    description: payload.description,
    start: { dateTime: payload.startIso, timeZone: "America/Chicago" },
    end: { dateTime: payload.endIso, timeZone: "America/Chicago" },
    attendees: payload.attendeeEmails.map((email) => ({ email })),
    conferenceData: {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
    reminders: { useDefault: true },
  };
  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events`
  );
  url.searchParams.set("conferenceDataVersion", "1");
  url.searchParams.set("sendUpdates", "all");
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`events.insert failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as CreatedEvent;
}

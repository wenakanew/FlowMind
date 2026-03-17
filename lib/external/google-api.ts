interface GmailHeader {
  name: string;
  value: string;
}

interface GmailMessage {
  id: string;
  threadId: string;
  snippet?: string;
  payload?: {
    headers?: GmailHeader[];
  };
}

interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  htmlLink?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

const GOOGLE_GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1";
const GOOGLE_CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";

function base64UrlEncode(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function googleRequest<T>(
  accessToken: string,
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google API error (${response.status}): ${text}`);
  }

  return (await response.json()) as T;
}

export async function gmailListMessages(accessToken: string, query = "", limit = 10) {
  const clamped = Math.max(1, Math.min(20, Number(limit) || 10));
  const params = new URLSearchParams({
    maxResults: String(clamped),
  });
  if (query.trim()) {
    params.set("q", query.trim());
  }

  const list = await googleRequest<{ messages?: Array<{ id: string }> }>(
    accessToken,
    `${GOOGLE_GMAIL_BASE}/users/me/messages?${params.toString()}`,
  );

  const ids = list.messages?.map((m) => m.id) || [];
  const messages: Array<{ id: string; from?: string; subject?: string; date?: string; snippet?: string }> = [];

  for (const id of ids) {
    const full = await googleRequest<GmailMessage>(
      accessToken,
      `${GOOGLE_GMAIL_BASE}/users/me/messages/${encodeURIComponent(id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
    );

    const headers = full.payload?.headers || [];
    const findHeader = (name: string) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;

    messages.push({
      id: full.id,
      from: findHeader("From"),
      subject: findHeader("Subject"),
      date: findHeader("Date"),
      snippet: full.snippet,
    });
  }

  return messages;
}

export async function gmailSendEmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
) {
  const raw = [
    `To: ${to}`,
    "Content-Type: text/plain; charset=utf-8",
    "MIME-Version: 1.0",
    `Subject: ${subject}`,
    "",
    body,
  ].join("\r\n");

  return googleRequest<{ id: string; threadId: string }>(
    accessToken,
    `${GOOGLE_GMAIL_BASE}/users/me/messages/send`,
    {
      method: "POST",
      body: JSON.stringify({ raw: base64UrlEncode(raw) }),
    },
  );
}

export async function gmailReplyToMessage(
  accessToken: string,
  messageId: string,
  replyBody: string,
) {
  const original = await googleRequest<GmailMessage>(
    accessToken,
    `${GOOGLE_GMAIL_BASE}/users/me/messages/${encodeURIComponent(messageId)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Message-ID&metadataHeaders=References`,
  );

  const headers = original.payload?.headers || [];
  const findHeader = (name: string) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;

  const to = findHeader("From");
  const originalSubject = findHeader("Subject") || "";
  const messageIdHeader = findHeader("Message-ID");
  const references = findHeader("References");

  if (!to) {
    throw new Error("Original email has no sender to reply to.");
  }

  const subject = /^re:/i.test(originalSubject) ? originalSubject : `Re: ${originalSubject}`;

  const lines = [
    `To: ${to}`,
    "Content-Type: text/plain; charset=utf-8",
    "MIME-Version: 1.0",
    `Subject: ${subject}`,
  ];

  if (messageIdHeader) {
    lines.push(`In-Reply-To: ${messageIdHeader}`);
  }
  if (references || messageIdHeader) {
    lines.push(`References: ${[references, messageIdHeader].filter(Boolean).join(" ")}`);
  }

  lines.push("", replyBody);

  return googleRequest<{ id: string; threadId: string }>(
    accessToken,
    `${GOOGLE_GMAIL_BASE}/users/me/messages/send`,
    {
      method: "POST",
      body: JSON.stringify({
        raw: base64UrlEncode(lines.join("\r\n")),
        threadId: original.threadId,
      }),
    },
  );
}

export async function calendarListEvents(
  accessToken: string,
  timeMinIso?: string,
  timeMaxIso?: string,
  limit = 10,
) {
  const clamped = Math.max(1, Math.min(50, Number(limit) || 10));
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(clamped),
    timeMin: timeMinIso || new Date().toISOString(),
  });

  if (timeMaxIso) {
    params.set("timeMax", timeMaxIso);
  }

  const response = await googleRequest<{ items?: CalendarEvent[] }>(
    accessToken,
    `${GOOGLE_CALENDAR_BASE}/calendars/primary/events?${params.toString()}`,
  );

  return response.items || [];
}

export async function calendarCreateEvent(
  accessToken: string,
  summary: string,
  startDateTime: string,
  endDateTime: string,
  description?: string,
) {
  return googleRequest<CalendarEvent>(
    accessToken,
    `${GOOGLE_CALENDAR_BASE}/calendars/primary/events`,
    {
      method: "POST",
      body: JSON.stringify({
        summary,
        description,
        start: { dateTime: startDateTime },
        end: { dateTime: endDateTime },
      }),
    },
  );
}

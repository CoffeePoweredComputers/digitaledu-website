/**
 * Google Calendar Integration
 *
 * Fetches events from Google Calendar and parses them into
 * structured data for three event categories.
 *
 * Event title formats:
 * Presentations (show on /seminars/):
 * - [Talk] Research Presentation Title
 * - [Seminar] Research Presentation Title
 *
 * Reading Group (show on /reading-group/):
 * - [Reading] Paper Discussion Title
 * - [Reading Group] Paper Discussion Title
 *
 * Writing & Feedback (show on /writing-feedback/):
 * - [Writing] Joint Writing Session
 * - [Feedback] Work-in-Progress Feedback Session
 *
 * Description format for presentations:
 * Speaker: Name
 * Affiliation: University/Organization
 * Abstract: Multi-line text...
 * Bio: Speaker biography...
 *
 * Description format for reading group:
 * Paper: Paper Title
 * Authors: Author names
 * Link: https://...
 * Facilitator: Name
 * Summary: Session summary...
 *
 * Description format for writing & feedback:
 * Facilitator: Name
 * Summary: Session description...
 */

const GOOGLE_CALENDAR_ID = import.meta.env.GOOGLE_CALENDAR_ID;
const GOOGLE_API_KEY = import.meta.env.GOOGLE_API_KEY;

// Event subtypes for more specific categorization
export type PresentationSubtype = 'talk';
export type ReadingGroupSubtype = 'reading';
export type WritingFeedbackSubtype = 'writing' | 'feedback';

export interface Speaker {
  name: string;
  affiliation?: string;
  bio?: string;
  url?: string;
  photo?: string;
}

export interface Paper {
  title: string;
  authors?: string;
  venue?: string;
  year?: number;
  link?: string;
}

export interface Presentation {
  id: string;
  type: 'seminar';
  subtype: PresentationSubtype;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  startDateTime: string;  // Full ISO datetime for timezone-aware display
  endDateTime: string;    // Full ISO datetime for timezone-aware display
  location?: string;
  speaker?: Speaker;
  abstract?: string;
  cancelled?: boolean;
}

export interface ReadingGroupSession {
  id: string;
  type: 'reading-group';
  subtype: ReadingGroupSubtype;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  startDateTime: string;  // Full ISO datetime for timezone-aware display
  endDateTime: string;    // Full ISO datetime for timezone-aware display
  location?: string;
  paper?: Paper;
  facilitator?: string;
  summary?: string;
  cancelled?: boolean;
}

export interface WritingFeedbackSession {
  id: string;
  type: 'writing-feedback';
  subtype: WritingFeedbackSubtype;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  startDateTime: string;  // Full ISO datetime for timezone-aware display
  endDateTime: string;    // Full ISO datetime for timezone-aware display
  location?: string;
  facilitator?: string;
  summary?: string;
  cancelled?: boolean;
}

export type CalendarEvent = Presentation | ReadingGroupSession | WritingFeedbackSession;

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  status?: string;
}

interface GoogleCalendarResponse {
  items?: GoogleCalendarEvent[];
  error?: {
    message: string;
  };
}

/**
 * Parse description text into key-value pairs
 */
function parseDescription(description: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!description) return result;

  // Normalize line breaks - Google Calendar sometimes uses <br> tags
  let normalized = description
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '') // Strip other HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');

  // Split by newlines and process
  const lines = normalized.split('\n');
  let currentKey = '';
  let currentValue = '';

  for (const line of lines) {
    // Check if line starts a new field (Key: Value format)
    const match = line.match(/^([A-Za-z]+):\s*(.*)$/);
    if (match) {
      // Save previous key-value if exists
      if (currentKey) {
        result[currentKey.toLowerCase()] = currentValue.trim();
      }
      currentKey = match[1];
      currentValue = match[2];
    } else if (currentKey) {
      // Continue multi-line value
      currentValue += '\n' + line;
    }
  }

  // Save last key-value
  if (currentKey) {
    result[currentKey.toLowerCase()] = currentValue.trim();
  }

  return result;
}

/**
 * Generate a URL-friendly slug from event title and date
 */
function generateSlug(title: string, date: Date): string {
  const dateStr = date.toISOString().split('T')[0];
  const titleSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  return `${dateStr}-${titleSlug}`;
}

/**
 * Extract time string (HH:MM) from ISO datetime
 * Parses directly from the string to avoid timezone conversion issues
 */
function extractTime(dateTimeStr: string): string {
  // ISO format: 2026-02-06T10:00:00-05:00 or 2026-02-06T10:00:00Z
  // Extract the time portion directly without Date conversion
  const timeMatch = dateTimeStr.match(/T(\d{2}):(\d{2})/);
  if (timeMatch) {
    return `${timeMatch[1]}:${timeMatch[2]}`;
  }
  // Fallback: use Date (may have timezone issues on server)
  const date = new Date(dateTimeStr);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/New_York',
  });
}

/**
 * Detect event type and subtype from title
 */
function detectEventType(summary: string): {
  category: 'presentation' | 'reading-group' | 'writing-feedback' | null;
  subtype: PresentationSubtype | ReadingGroupSubtype | WritingFeedbackSubtype | null;
  prefix: RegExp | null;
} {
  // Presentations: [Talk], [Seminar]
  if (/^\s*\[talk\]/i.test(summary)) {
    return { category: 'presentation', subtype: 'talk', prefix: /^\s*\[talk\]\s*/i };
  }
  if (/^\s*\[seminar\]/i.test(summary)) {
    return { category: 'presentation', subtype: 'talk', prefix: /^\s*\[seminar\]\s*/i };
  }

  // Reading Group: [Reading], [Reading Group]
  if (/^\s*\[reading\s*group\]/i.test(summary)) {
    return { category: 'reading-group', subtype: 'reading', prefix: /^\s*\[reading\s*group\]\s*/i };
  }
  if (/^\s*\[reading\]/i.test(summary)) {
    return { category: 'reading-group', subtype: 'reading', prefix: /^\s*\[reading\]\s*/i };
  }

  // Writing & Feedback: [Writing], [Feedback]
  if (/^\s*\[writing\]/i.test(summary)) {
    return { category: 'writing-feedback', subtype: 'writing', prefix: /^\s*\[writing\]\s*/i };
  }
  if (/^\s*\[feedback\]/i.test(summary)) {
    return { category: 'writing-feedback', subtype: 'feedback', prefix: /^\s*\[feedback\]\s*/i };
  }

  return { category: null, subtype: null, prefix: null };
}

/**
 * Parse a Google Calendar event into our event format
 */
function parseEvent(event: GoogleCalendarEvent): CalendarEvent | null {
  const summary = (event.summary || '').trim();

  const { category, subtype, prefix } = detectEventType(summary);

  if (!category || !subtype || !prefix) {
    // Skip events that don't match our format
    return null;
  }

  // Extract title (remove prefix)
  const title = summary.replace(prefix, '').trim();

  // Parse dates
  const startDateTimeStr = event.start.dateTime || event.start.date || '';
  const endDateTimeStr = event.end.dateTime || event.end.date || '';
  const date = new Date(startDateTimeStr);
  const startTime = event.start.dateTime ? extractTime(startDateTimeStr) : '12:00';
  const endTime = event.end.dateTime ? extractTime(endDateTimeStr) : '13:00';

  // Store full ISO datetime for client-side timezone conversion
  // For all-day events, create a datetime at noon Eastern
  const startDateTime = event.start.dateTime || `${event.start.date}T12:00:00-05:00`;
  const endDateTime = event.end.dateTime || `${event.end.date}T13:00:00-05:00`;

  // Parse description
  const parsed = parseDescription(event.description || '');

  // Check if cancelled
  const cancelled = event.status === 'cancelled' ||
    summary.toLowerCase().includes('cancelled') ||
    summary.toLowerCase().includes('canceled');

  const id = generateSlug(title, date);

  if (category === 'presentation') {
    const presentation: Presentation = {
      id,
      type: 'seminar',
      subtype: subtype as PresentationSubtype,
      title,
      date,
      startTime,
      endTime,
      startDateTime,
      endDateTime,
      location: event.location || parsed.location,
      cancelled,
    };

    // Add speaker info if present
    if (parsed.speaker || parsed.presenter) {
      presentation.speaker = {
        name: parsed.speaker || parsed.presenter,
        affiliation: parsed.affiliation,
        bio: parsed.bio,
        url: parsed.url,
        photo: parsed.photo,
      };
    }

    if (parsed.abstract || parsed.description) {
      presentation.abstract = parsed.abstract || parsed.description;
    }

    return presentation;
  }

  if (category === 'reading-group') {
    const session: ReadingGroupSession = {
      id,
      type: 'reading-group',
      subtype: subtype as ReadingGroupSubtype,
      title,
      date,
      startTime,
      endTime,
      startDateTime,
      endDateTime,
      location: event.location || parsed.location,
      cancelled,
    };

    // Add paper info if present
    if (parsed.paper || parsed.title) {
      session.paper = {
        title: parsed.paper || parsed.title || title,
        authors: parsed.authors,
        link: parsed.link || parsed.url,
      };
    }

    if (parsed.facilitator || parsed.lead || parsed.leader) {
      session.facilitator = parsed.facilitator || parsed.lead || parsed.leader;
    }

    if (parsed.summary || parsed.description || parsed.goal) {
      session.summary = parsed.summary || parsed.description || parsed.goal;
    }

    return session;
  }

  if (category === 'writing-feedback') {
    const session: WritingFeedbackSession = {
      id,
      type: 'writing-feedback',
      subtype: subtype as WritingFeedbackSubtype,
      title,
      date,
      startTime,
      endTime,
      startDateTime,
      endDateTime,
      location: event.location || parsed.location,
      cancelled,
    };

    if (parsed.facilitator || parsed.lead || parsed.leader) {
      session.facilitator = parsed.facilitator || parsed.lead || parsed.leader;
    }

    if (parsed.summary || parsed.description || parsed.goal) {
      session.summary = parsed.summary || parsed.description || parsed.goal;
    }

    return session;
  }

  return null;
}

/**
 * Fetch all events from Google Calendar
 */
export async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  const timeMin = new Date('2024-01-01').toISOString();
  const timeMax = new Date('2026-12-31').toISOString();

  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events`);
  url.searchParams.set('key', GOOGLE_API_KEY);
  url.searchParams.set('timeMin', timeMin);
  url.searchParams.set('timeMax', timeMax);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '250');

  try {
    const response = await fetch(url.toString());
    const data: GoogleCalendarResponse = await response.json();

    if (data.error) {
      console.error('Google Calendar API error:', data.error.message);
      return [];
    }

    const events: CalendarEvent[] = [];
    for (const item of data.items || []) {
      const parsed = parseEvent(item);
      if (parsed) {
        events.push(parsed);
      }
    }

    return events;
  } catch (error) {
    console.error('Failed to fetch calendar events:', error);
    return [];
  }
}

/**
 * Get all presentations (research talks only)
 */
export async function getSeminars(): Promise<Presentation[]> {
  const events = await fetchCalendarEvents();
  return events.filter((e): e is Presentation => e.type === 'seminar');
}

// Alias for clarity
export const getPresentations = getSeminars;

/**
 * Get all reading group sessions (paper discussions only)
 */
export async function getReadingGroups(): Promise<ReadingGroupSession[]> {
  const events = await fetchCalendarEvents();
  return events.filter((e): e is ReadingGroupSession => e.type === 'reading-group');
}

/**
 * Get all writing & feedback sessions
 */
export async function getWritingFeedbackSessions(): Promise<WritingFeedbackSession[]> {
  const events = await fetchCalendarEvents();
  return events.filter((e): e is WritingFeedbackSession => e.type === 'writing-feedback');
}

/**
 * Get upcoming events (from today onwards)
 */
export async function getUpcomingEvents(): Promise<CalendarEvent[]> {
  const events = await fetchCalendarEvents();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return events
    .filter((e) => new Date(e.date) >= now && !e.cancelled)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Get subtype display label
 */
export function getSubtypeLabel(event: CalendarEvent): string {
  if (event.type === 'seminar') {
    return 'Research Talk';
  } else if (event.type === 'reading-group') {
    return 'Paper Discussion';
  } else if (event.type === 'writing-feedback') {
    const session = event as WritingFeedbackSession;
    switch (session.subtype) {
      case 'writing': return 'Writing Session';
      case 'feedback': return 'Feedback Session';
      default: return 'Writing & Feedback';
    }
  }
  return 'Event';
}

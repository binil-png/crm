import { getTimeZone } from '../utils/constants';
import { getAccessToken, getCalendarId, googleFetch, isDemoMode, isGapiReady } from './googleApi';
import * as mock from './mockBackend';

const splitEmails = (value) =>
  String(value || '')
    .split(/[,\s;]+/)
    .map((email) => email.trim())
    .filter(Boolean);

const toEventTimes = (start, end) => ({
  start: { dateTime: new Date(start).toISOString(), timeZone: getTimeZone() },
  end: { dateTime: new Date(end).toISOString(), timeZone: getTimeZone() },
});

const buildEventResource = ({ title, start, end, attendees, description }) => ({
  summary: title,
  description: description || '',
  ...toEventTimes(start, end),
  attendees: splitEmails(attendees).map((email) => ({ email })),
  conferenceData: {
    createRequest: {
      requestId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      conferenceSolutionKey: { type: 'hangoutsMeet' },
    },
  },
});

export const createCalendarEvent = async ({ title, start, end, attendees, description }) => {
  if (isDemoMode()) {
    return mock.mockCreateCalendarEvent({ title, start, end, attendees });
  }

  const resource = buildEventResource({ title, start, end, attendees, description });
  const calendarId = encodeURIComponent(getCalendarId());

  if (isGapiReady()) {
    const response = await window.gapi.client.calendar.events.insert({
      calendarId: getCalendarId(),
      conferenceDataVersion: 1,
      sendUpdates: 'all',
      resource,
    });
    return response.result;
  }

  return googleFetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?conferenceDataVersion=1&sendUpdates=all`,
    { method: 'POST', body: JSON.stringify(resource) }
  );
};

export const patchCalendarEvent = async (eventId, { start, end, title, attendees }) => {
  if (!eventId) throw new Error('Calendar event id is missing.');
  if (isDemoMode()) return mock.mockPatchCalendarEvent(eventId, { start, end });

  const resource = {
    ...(title ? { summary: title } : {}),
    ...(start && end ? toEventTimes(start, end) : {}),
    ...(attendees ? { attendees: splitEmails(attendees).map((email) => ({ email })) } : {}),
  };

  const calendarId = encodeURIComponent(getCalendarId());

  if (isGapiReady()) {
    const response = await window.gapi.client.calendar.events.patch({
      calendarId: getCalendarId(),
      eventId,
      sendUpdates: 'all',
      conferenceDataVersion: 1,
      resource,
    });
    return response.result;
  }

  const token = getAccessToken();
  if (!token) throw new Error('Not signed in.');
  return googleFetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    { method: 'PATCH', body: JSON.stringify(resource) }
  );
};

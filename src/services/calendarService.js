import { getTimeZone, normalizeCalendarId } from '../utils/constants';
import { getAccessToken, getCalendarId, googleFetch, isDemoMode, isGapiReady } from './googleApi';
import * as mock from './mockBackend';

const splitEmails = (value) =>
  String(value || '')
    .split(/[,\s;]+/)
    .map((email) => email.trim().toLowerCase())
    .filter((email, index, list) => email.includes('@') && list.indexOf(email) === index);

const toEventTimes = (start, end) => ({
  start: { dateTime: new Date(start).toISOString(), timeZone: getTimeZone() },
  end: { dateTime: new Date(end).toISOString(), timeZone: getTimeZone() },
});

const attendeeObjects = (attendees, names = {}) =>
  splitEmails(attendees).map((email) => {
    const displayName = names[email] || names[email.toLowerCase()] || '';
    return displayName
      ? { email, displayName, responseStatus: 'needsAction' }
      : { email, responseStatus: 'needsAction' };
  });

const buildEventResource = ({ title, start, end, attendees, attendeeNames, description }) => ({
  summary: title,
  description: description || '',
  ...toEventTimes(start, end),
  attendees: attendeeObjects(attendees, attendeeNames),
  guestsCanModify: false,
  guestsCanInviteOthers: false,
  guestsCanSeeOtherGuests: true,
  reminders: { useDefault: true },
  conferenceData: {
    createRequest: {
      requestId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      conferenceSolutionKey: { type: 'hangoutsMeet' },
    },
  },
});

const resolveCalendar = (calendarId) =>
  normalizeCalendarId(calendarId || getCalendarId() || 'primary') || 'primary';

export const createCalendarEvent = async ({ title, start, end, attendees, attendeeNames, description, calendarId }) => {
  if (isDemoMode()) {
    return mock.mockCreateCalendarEvent({ title, start, end, attendees });
  }

  const resource = buildEventResource({ title, start, end, attendees, attendeeNames, description });
  const target = resolveCalendar(calendarId);
  const encoded = encodeURIComponent(target);

  if (isGapiReady()) {
    const response = await window.gapi.client.calendar.events.insert({
      calendarId: target,
      conferenceDataVersion: 1,
      sendUpdates: 'all',
      resource,
    });
    return response.result;
  }

  return googleFetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encoded}/events?conferenceDataVersion=1&sendUpdates=all`,
    { method: 'POST', body: JSON.stringify(resource) }
  );
};

export const patchCalendarEvent = async (eventId, { start, end, title, attendees, attendeeNames, calendarId }) => {
  if (!eventId) throw new Error('Calendar event id is missing.');
  if (isDemoMode()) return mock.mockPatchCalendarEvent(eventId, { start, end });

  const resource = {
    ...(title ? { summary: title } : {}),
    ...(start && end ? toEventTimes(start, end) : {}),
    ...(attendees ? { attendees: attendeeObjects(attendees, attendeeNames) } : {}),
  };

  const target = resolveCalendar(calendarId);
  const encoded = encodeURIComponent(target);

  if (isGapiReady()) {
    const response = await window.gapi.client.calendar.events.patch({
      calendarId: target,
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
    `https://www.googleapis.com/calendar/v3/calendars/${encoded}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    { method: 'PATCH', body: JSON.stringify(resource) }
  );
};

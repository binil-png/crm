import {
  STORAGE_KEYS,
  formatDdMmYyyyHm,
  getCallScheduleState,
  getLeadScheduleAt,
  isTrainingNotStarted,
  leadKey,
} from '../utils/constants';
import { currentUserEmail, sendImmediatePush } from './pushNotifications';

const EVENT = 'crm-notifications';
const MAX_ITEMS = 40;

const readJson = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '') || fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));

const inboxKey = () => `${STORAGE_KEYS.NOTIFICATIONS}:${currentUserEmail() || 'guest'}`;
const firedKey = () => `${STORAGE_KEYS.NOTIFICATION_FIRED}:${currentUserEmail() || 'guest'}`;
const seenHandoffKey = () => `${STORAGE_KEYS.NOTIFICATION_SEEN_HANDOFFS}:${currentUserEmail() || 'guest'}`;

const emit = () => window.dispatchEvent(new Event(EVENT));

const showBrowserNotification = (title, body, tag) => {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, tag: tag || title });
  } catch {
    // Ignore browsers that block Notification construction without a service worker.
  }
};

export const listNotifications = () => {
  const rows = readJson(inboxKey(), []);
  return Array.isArray(rows) ? rows : [];
};

export const unreadNotificationCount = () => listNotifications().filter((item) => !item.read).length;

export const markNotificationRead = (id) => {
  writeJson(
    inboxKey(),
    listNotifications().map((item) => (item.id === id ? { ...item, read: true } : item))
  );
  emit();
};

export const markAllNotificationsRead = () => {
  writeJson(
    inboxKey(),
    listNotifications().map((item) => ({ ...item, read: true }))
  );
  emit();
};

export const subscribeNotifications = (onChange) => {
  const handler = () => onChange(listNotifications());
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
};

export const addNotification = async ({
  id,
  type,
  title,
  body,
  emails = [],
  silent = false,
  push = false,
}) => {
  const mine = currentUserEmail();
  const recipients = [...new Set((emails || []).map((email) => String(email || '').trim().toLowerCase()).filter(Boolean))];
  const forMe = !recipients.length || !mine || recipients.includes(mine);
  if (forMe) {
    const next = {
      id: id || `nt-${Date.now()}`,
      type: type || 'info',
      title,
      body,
      at: new Date().toISOString(),
      read: Boolean(silent),
    };
    const rest = listNotifications().filter((item) => item.id !== next.id);
    writeJson(inboxKey(), [next, ...rest].slice(0, MAX_ITEMS));
    emit();
    if (!silent) showBrowserNotification(title, body, next.id);
  }
  if (push && recipients.length) {
    await sendImmediatePush({ id, title, body, emails: recipients });
  }
};

const readSet = (key) => new Set(readJson(key, []));
const writeSet = (key, value) => writeJson(key, [...value]);

export const remindDueCalls = (leads = [], now = new Date()) => {
  const fired = readSet(firedKey());
  leads.forEach((lead) => {
    const state = getCallScheduleState(lead, now);
    if (state !== 'soon' && state !== 'overdue') return;
    const id = `call-${state}-${leadKey(lead)}`;
    if (fired.has(id)) return;
    fired.add(id);
    const at = getLeadScheduleAt(lead);
    const when = at ? formatDdMmYyyyHm(at) : '';
    addNotification({
      id,
      type: 'call',
      title: state === 'soon' ? `Call in 5 minutes · ${lead['Customer Name']}` : `Call overdue · ${lead['Customer Name']}`,
      body: [when, lead['Contact Number']].filter(Boolean).join(' · '),
      emails: [currentUserEmail()].filter(Boolean),
    });
  });
  writeSet(firedKey(), fired);
};

export const remindTrainingHandoffs = (clients = []) => {
  const pending = clients.filter(
    (client) => !String(client.Assigned_Trainer || '').trim() && isTrainingNotStarted(client)
  );
  const ids = pending.map((client) => `handoff-${client.Client_ID}`);
  const seen = readSet(seenHandoffKey());
  if (!seen.size) {
    writeSet(seenHandoffKey(), new Set(ids));
    return;
  }
  pending.forEach((client) => {
    const id = `handoff-${client.Client_ID}`;
    if (seen.has(id)) return;
    seen.add(id);
    addNotification({
      id,
      type: 'training',
      title: 'New client for training',
      body: `${client.Client_Name} was passed to the training team.`,
      emails: [currentUserEmail()].filter(Boolean),
    });
  });
  writeSet(seenHandoffKey(), seen);
};

export const notifyCallScheduled = async (lead, startAt) => {
  const when = formatDdMmYyyyHm(startAt);
  const name = lead['Customer Name'] || 'client';
  return addNotification({
    id: `call-booked-${leadKey(lead)}-${new Date(startAt).getTime()}`,
    type: 'call',
    title: `Call scheduled · ${name}`,
    body: when,
    emails: [currentUserEmail()].filter(Boolean),
  });
};

export const notifyPassedToTraining = async ({ client, lead, emails = [] }) => {
  const name = client?.Client_Name || lead?.['Customer Name'] || 'Client';
  const recipients = [...emails, currentUserEmail()].filter(Boolean);
  return addNotification({
    id: `handoff-${client?.Client_ID || leadKey(lead)}`,
    type: 'training',
    title: 'Passed to training team',
    body: `${name} is waiting to be assigned a trainer.`,
    emails: recipients,
    push: true,
  });
};

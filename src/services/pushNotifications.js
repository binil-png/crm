import { CALL_SOON_MS, STORAGE_KEYS } from '../utils/constants';

const PUSH_IDS_KEY = 'crm_push_notification_ids';
const configuredAppId = () => {
  const value = String(import.meta.env.VITE_ONESIGNAL_APP_ID || '').trim();
  return value && !value.startsWith('your-') ? value : '';
};

export const isPushConfigured = () => Boolean(configuredAppId());

const pushApiUrl = () => String(import.meta.env.VITE_PUSH_API_URL || '/api/push').trim() || '/api/push';

const readStoredIds = () => {
  try {
    return JSON.parse(localStorage.getItem(PUSH_IDS_KEY) || '{}');
  } catch {
    return {};
  }
};

const writeStoredIds = (value) => localStorage.setItem(PUSH_IDS_KEY, JSON.stringify(value));

export const currentUserEmail = () => {
  try {
    return String(JSON.parse(sessionStorage.getItem(STORAGE_KEYS.USER) || 'null')?.email || '')
      .trim()
      .toLowerCase();
  } catch {
    return '';
  }
};

const accessToken = () => sessionStorage.getItem(STORAGE_KEYS.TOKEN) || '';

let sdkPromise = null;

const loadOneSignal = () => {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push((OneSignal) => resolve(OneSignal));
    if (document.getElementById('onesignal-sdk')) return;
    const script = document.createElement('script');
    script.id = 'onesignal-sdk';
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.defer = true;
    script.onerror = () => reject(new Error('Could not load OneSignal.'));
    document.head.appendChild(script);
  });
  return sdkPromise;
};

let initPromise = null;

export const initPushNotifications = async (user) => {
  const appId = configuredAppId();
  if (!appId) return false;
  if (!initPromise) {
    initPromise = (async () => {
      const OneSignal = await loadOneSignal();
      await OneSignal.init({
        appId,
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerPath: 'OneSignalSDKWorker.js',
        serviceWorkerParam: { scope: '/' },
      });
      return OneSignal;
    })();
  }
  const OneSignal = await initPromise;
  const email = user?.email || currentUserEmail();
  if (email && OneSignal.login) {
    await OneSignal.login(email.toLowerCase());
  }
  return true;
};

export const getPushPermission = async () => {
  if (!isPushConfigured() || typeof Notification === 'undefined') return 'unsupported';
  try {
    await initPushNotifications();
  } catch {
    return Notification.permission;
  }
  const OneSignal = await initPromise;
  return OneSignal?.Notifications?.permissionNative || Notification.permission;
};

export const requestPushPermission = async () => {
  await initPushNotifications();
  const OneSignal = await initPromise;
  if (!OneSignal) return 'denied';
  await OneSignal.Notifications.requestPermission();
  return OneSignal.Notifications.permissionNative || Notification.permission;
};

const callPushApi = async (payload) => {
  const response = await fetch(pushApiUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken() ? { Authorization: `Bearer ${accessToken()}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || 'Could not reach the push service.');
  }
  return result;
};

export const cancelTimedPush = async (id) => {
  const stored = readStoredIds();
  const notificationIds = stored[id];
  if (!notificationIds?.length) return;
  try {
    await callPushApi({ action: 'cancel', notificationIds });
  } catch (error) {
    console.warn(error);
  }
  delete stored[id];
  writeStoredIds(stored);
};

export const scheduleTimedPush = async ({
  id,
  startAt,
  title,
  body,
  emails,
  url = '/',
}) => {
  if (!isPushConfigured() || !id || !startAt) return { skipped: true };
  const start = startAt instanceof Date ? startAt : new Date(startAt);
  if (Number.isNaN(start.getTime())) return { skipped: true };

  const recipients = [...new Set((emails || [currentUserEmail()]).map((email) => String(email || '').trim().toLowerCase()).filter(Boolean))];
  if (!recipients.length) return { skipped: true };

  await cancelTimedPush(id);

  const now = Date.now();
  const jobs = [
    {
      suffix: 'soon',
      title: title.includes('in 5 minutes') ? title : `${title} in 5 minutes`,
      sendAt: new Date(start.getTime() - CALL_SOON_MS),
    },
    {
      suffix: 'start',
      title,
      sendAt: start,
    },
  ].filter((job) => job.sendAt.getTime() > now + 8000);

  const notificationIds = [];
  for (const job of jobs) {
    try {
      const result = await callPushApi({
        action: 'send',
        id: `${id}:${job.suffix}`,
        emails: recipients,
        title: job.title,
        body,
        sendAt: job.sendAt.toISOString(),
        url,
      });
      if (result.id) notificationIds.push(result.id);
    } catch (error) {
      console.warn(error);
    }
  }

  if (notificationIds.length) {
    writeStoredIds({ ...readStoredIds(), [id]: notificationIds });
  }
  return { id, notificationIds };
};

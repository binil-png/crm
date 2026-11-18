import { gapi } from 'gapi-script';
import { DISCOVERY_DOCS, STORAGE_KEYS } from '../utils/constants';

let gapiReady = false;
let accessToken = sessionStorage.getItem(STORAGE_KEYS.TOKEN) || '';

const envValue = (key, fallback = '') => {
  const value = String(import.meta.env[key] || '').trim();
  if (!value || value.startsWith('your-')) return fallback;
  return value;
};

const sanitizeApiKey = (value) => {
  const key = String(value || '').trim();
  if (!key || key.startsWith('your-') || key.startsWith('GOCSPX-')) return '';
  return key;
};

export const getConfig = () => ({
  clientId: localStorage.getItem(STORAGE_KEYS.CLIENT_ID) || envValue('VITE_GOOGLE_CLIENT_ID'),
  apiKey: sanitizeApiKey(localStorage.getItem(STORAGE_KEYS.API_KEY) || envValue('VITE_GOOGLE_API_KEY')),
  spreadsheetId: localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID) || envValue('VITE_GOOGLE_SPREADSHEET_ID'),
  trainingSpreadsheetId:
    localStorage.getItem(STORAGE_KEYS.TRAINING_SPREADSHEET_ID) || envValue('VITE_GOOGLE_TRAINING_SPREADSHEET_ID'),
  calendarId: localStorage.getItem(STORAGE_KEYS.CALENDAR_ID) || envValue('VITE_GOOGLE_CALENDAR_ID', 'primary'),
  demoMode: localStorage.getItem(STORAGE_KEYS.DEMO_MODE) === '1',
});

export const saveConfig = ({ clientId, apiKey, spreadsheetId, trainingSpreadsheetId, calendarId, demoMode }) => {
  if (demoMode) {
    localStorage.setItem(STORAGE_KEYS.DEMO_MODE, '1');
    return;
  }
  localStorage.removeItem(STORAGE_KEYS.DEMO_MODE);
  if (clientId) localStorage.setItem(STORAGE_KEYS.CLIENT_ID, clientId.trim());
  const safeApiKey = sanitizeApiKey(apiKey);
  if (safeApiKey) localStorage.setItem(STORAGE_KEYS.API_KEY, safeApiKey);
  else localStorage.removeItem(STORAGE_KEYS.API_KEY);
  if (spreadsheetId) localStorage.setItem(STORAGE_KEYS.SPREADSHEET_ID, spreadsheetId.trim());
  if (trainingSpreadsheetId) localStorage.setItem(STORAGE_KEYS.TRAINING_SPREADSHEET_ID, trainingSpreadsheetId.trim());
  if (calendarId) localStorage.setItem(STORAGE_KEYS.CALENDAR_ID, calendarId.trim());
};

export const resetConfig = () => {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

export const isDemoMode = () => getConfig().demoMode;

export const enableLocalDemo = () => {
  localStorage.setItem(STORAGE_KEYS.DEMO_MODE, '1');
};

export const disableLocalDemo = () => {
  localStorage.removeItem(STORAGE_KEYS.DEMO_MODE);
};

const sheetsProxyUrl = () => envValue('VITE_SHEETS_API_URL', '/api/sheets') || '/api/sheets';

let appSheetsStatus = { enabled: false, shareWith: '' };

export const getAppSheetsStatus = () => appSheetsStatus;

export const isAppSheetsEnabled = () => Boolean(appSheetsStatus.enabled);

export const refreshAppSheetsStatus = async () => {
  try {
    const response = await fetch(sheetsProxyUrl());
    const data = await response.json();
    appSheetsStatus = {
      enabled: Boolean(data?.enabled),
      shareWith: String(data?.shareWith || '').trim(),
    };
  } catch {
    appSheetsStatus = { enabled: false, shareWith: '' };
  }
  return appSheetsStatus;
};

const isAppSheetsUrl = (url) =>
  /^https:\/\/sheets\.googleapis\.com\/v4\/spreadsheets\//.test(url) ||
  /^https:\/\/www\.googleapis\.com\/drive\/v3\/files\//.test(url);

export const getSpreadsheetId = () => getConfig().spreadsheetId;

export const getTrainingSpreadsheetId = () => getConfig().trainingSpreadsheetId;

export const getCalendarId = () => getConfig().calendarId || 'primary';

export const getAccessToken = () => accessToken;

export const setAccessToken = (token) => {
  accessToken = token || '';
  if (token) {
    sessionStorage.setItem(STORAGE_KEYS.TOKEN, token);
    if (gapiReady && window.gapi?.client) {
      window.gapi.client.setToken({ access_token: token });
    }
  } else {
    sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.TOKEN_EXP);
    if (gapiReady && window.gapi?.client) {
      window.gapi.client.setToken(null);
    }
  }
};

const loadGapi = () =>
  new Promise((resolve, reject) => {
    const api = window.gapi || gapi;
    if (!api) {
      reject(new Error('Google API script failed to load.'));
      return;
    }
    api.load('client', () => resolve(api));
  });

export const initGapi = async () => {
  if (isDemoMode()) return true;
  await refreshAppSheetsStatus();
  if (isAppSheetsEnabled()) {
    gapiReady = false;
    return true;
  }
  if (gapiReady) return true;
  const { apiKey } = getConfig();
  try {
    const api = await loadGapi();
    await api.client.init({
      ...(apiKey ? { apiKey } : {}),
      discoveryDocs: DISCOVERY_DOCS,
    });
    if (accessToken) {
      api.client.setToken({ access_token: accessToken });
    }
    gapiReady = true;
    return true;
  } catch (error) {
    console.warn('gapi init failed, REST fallback will be used.', error);
    gapiReady = false;
    return false;
  }
};

export const isGapiReady = () => gapiReady && Boolean(window.gapi?.client);

const parseError = async (response) => {
  try {
    const body = await response.json();
    return body.error?.message || (typeof body.error === 'string' ? body.error : '') || response.statusText;
  } catch {
    return response.statusText;
  }
};

export const googleFetch = async (url, options = {}) => {
  const token = getAccessToken();
  if (!token) throw new Error('Not signed in.');
  const useAppSheets = isAppSheetsEnabled() && isAppSheetsUrl(url);
  const response = useAppSheets
    ? await fetch(sheetsProxyUrl(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          method: options.method || 'GET',
          body: options.body ? JSON.parse(options.body) : undefined,
        }),
      })
    : await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  if (response.status === 204) return null;
  return response.json();
};

export const fetchUserProfile = async (token = getAccessToken()) => {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Unable to load Google profile.');
  const profile = await response.json();
  const email = String(profile.email || '').trim().toLowerCase();
  if (!email) {
    throw new Error('Google did not return an email. Grant email access and sign in again.');
  }
  return {
    ...profile,
    email,
    name: String(profile.name || [profile.given_name, profile.family_name].filter(Boolean).join(' ') || email.split('@')[0]).trim(),
    picture: profile.picture || '',
  };
};

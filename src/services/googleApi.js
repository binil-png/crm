import { gapi } from 'gapi-script';
import { DISCOVERY_DOCS, STORAGE_KEYS } from '../utils/constants';

let gapiReady = false;
let accessToken = sessionStorage.getItem(STORAGE_KEYS.TOKEN) || '';

const envValue = (key, fallback = '') => {
  const value = String(import.meta.env[key] || '').trim();
  if (!value || value.startsWith('your-')) return fallback;
  return value;
};

export const getConfig = () => ({
  clientId: localStorage.getItem(STORAGE_KEYS.CLIENT_ID) || envValue('VITE_GOOGLE_CLIENT_ID'),
  apiKey: localStorage.getItem(STORAGE_KEYS.API_KEY) || envValue('VITE_GOOGLE_API_KEY'),
  spreadsheetId: localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID) || envValue('VITE_GOOGLE_SPREADSHEET_ID'),
  calendarId: localStorage.getItem(STORAGE_KEYS.CALENDAR_ID) || envValue('VITE_GOOGLE_CALENDAR_ID', 'primary'),
  demoMode: localStorage.getItem(STORAGE_KEYS.DEMO_MODE) === '1',
});

export const saveConfig = ({ clientId, apiKey, spreadsheetId, calendarId, demoMode }) => {
  if (demoMode) {
    localStorage.setItem(STORAGE_KEYS.DEMO_MODE, '1');
    return;
  }
  localStorage.removeItem(STORAGE_KEYS.DEMO_MODE);
  if (clientId) localStorage.setItem(STORAGE_KEYS.CLIENT_ID, clientId.trim());
  if (apiKey) localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey.trim());
  if (spreadsheetId) localStorage.setItem(STORAGE_KEYS.SPREADSHEET_ID, spreadsheetId.trim());
  if (calendarId) localStorage.setItem(STORAGE_KEYS.CALENDAR_ID, calendarId.trim());
};

export const resetConfig = () => {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

export const isDemoMode = () => getConfig().demoMode;

export const getSpreadsheetId = () => getConfig().spreadsheetId;

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
  if (isDemoMode() || gapiReady) return true;
  const { apiKey } = getConfig();
  try {
    const api = await loadGapi();
    await api.client.init({
      apiKey: apiKey || undefined,
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
    return body.error?.message || response.statusText;
  } catch {
    return response.statusText;
  }
};

export const googleFetch = async (url, options = {}) => {
  const token = getAccessToken();
  if (!token) throw new Error('Not signed in.');
  const response = await fetch(url, {
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
  return response.json();
};

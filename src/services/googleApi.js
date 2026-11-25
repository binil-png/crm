import { gapi } from 'gapi-script';
import { DISCOVERY_DOCS, HARDCODED_CONFIG_SPREADSHEET_ID, SCOPES, STORAGE_KEYS } from '../utils/constants';

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

let workbookOverride = {
  spreadsheetId: '',
  trainingSpreadsheetId: '',
  employeesSpreadsheetId: '',
  salesAccount: '',
  trainingAccount: '',
  employeesAccount: '',
};

const storedOrEnv = (storageKey, envKey, fallback = '') =>
  localStorage.getItem(storageKey) || envValue(envKey, fallback);

export const getConfig = () => {
  const spreadsheetId =
    workbookOverride.spreadsheetId || storedOrEnv(STORAGE_KEYS.SPREADSHEET_ID, 'VITE_GOOGLE_SPREADSHEET_ID');
  const trainingSpreadsheetId =
    workbookOverride.trainingSpreadsheetId ||
    storedOrEnv(STORAGE_KEYS.TRAINING_SPREADSHEET_ID, 'VITE_GOOGLE_TRAINING_SPREADSHEET_ID');
  const employeesSpreadsheetId =
    workbookOverride.employeesSpreadsheetId ||
    storedOrEnv(STORAGE_KEYS.EMPLOYEES_SPREADSHEET_ID, 'VITE_GOOGLE_EMPLOYEES_SPREADSHEET_ID');
  return {
    clientId: localStorage.getItem(STORAGE_KEYS.CLIENT_ID) || envValue('VITE_GOOGLE_CLIENT_ID'),
    apiKey: sanitizeApiKey(localStorage.getItem(STORAGE_KEYS.API_KEY) || envValue('VITE_GOOGLE_API_KEY')),
    spreadsheetId,
    trainingSpreadsheetId,
    employeesSpreadsheetId,
    configSpreadsheetId:
      envValue('VITE_GOOGLE_CONFIG_SPREADSHEET_ID') ||
      HARDCODED_CONFIG_SPREADSHEET_ID ||
      localStorage.getItem(STORAGE_KEYS.CONFIG_SPREADSHEET_ID) ||
      '',
    salesAccount: workbookOverride.salesAccount || localStorage.getItem(STORAGE_KEYS.SALES_GOOGLE_ACCOUNT) || '',
    trainingAccount:
      workbookOverride.trainingAccount || localStorage.getItem(STORAGE_KEYS.TRAINING_GOOGLE_ACCOUNT) || '',
    employeesAccount:
      workbookOverride.employeesAccount || localStorage.getItem(STORAGE_KEYS.EMPLOYEES_GOOGLE_ACCOUNT) || '',
    calendarId: localStorage.getItem(STORAGE_KEYS.CALENDAR_ID) || envValue('VITE_GOOGLE_CALENDAR_ID', 'primary'),
    demoMode: localStorage.getItem(STORAGE_KEYS.DEMO_MODE) === '1',
  };
};

const writeConfigValue = (key, value) => {
  const text = String(value || '').trim();
  if (text) localStorage.setItem(key, text);
  else localStorage.removeItem(key);
};

export const applyWorkbookOverride = (partial = {}) => {
  workbookOverride = {
    ...workbookOverride,
    ...Object.fromEntries(
      Object.entries(partial).map(([key, value]) => [key, String(value || '').trim()])
    ),
  };
};

export const saveConfig = ({
  clientId,
  apiKey,
  spreadsheetId,
  trainingSpreadsheetId,
  employeesSpreadsheetId,
  configSpreadsheetId,
  salesAccount,
  trainingAccount,
  employeesAccount,
  calendarId,
  demoMode,
} = {}) => {
  if (demoMode === true) localStorage.setItem(STORAGE_KEYS.DEMO_MODE, '1');
  else if (demoMode === false) localStorage.removeItem(STORAGE_KEYS.DEMO_MODE);
  if (clientId) localStorage.setItem(STORAGE_KEYS.CLIENT_ID, clientId.trim());
  const safeApiKey = sanitizeApiKey(apiKey);
  if (safeApiKey) localStorage.setItem(STORAGE_KEYS.API_KEY, safeApiKey);
  else if (apiKey !== undefined) localStorage.removeItem(STORAGE_KEYS.API_KEY);
  if (spreadsheetId) localStorage.setItem(STORAGE_KEYS.SPREADSHEET_ID, spreadsheetId.trim());
  if (trainingSpreadsheetId) localStorage.setItem(STORAGE_KEYS.TRAINING_SPREADSHEET_ID, trainingSpreadsheetId.trim());
  if (employeesSpreadsheetId !== undefined) {
    writeConfigValue(STORAGE_KEYS.EMPLOYEES_SPREADSHEET_ID, employeesSpreadsheetId);
  }
  if (configSpreadsheetId) localStorage.setItem(STORAGE_KEYS.CONFIG_SPREADSHEET_ID, configSpreadsheetId.trim());
  else if (
    spreadsheetId &&
    !localStorage.getItem(STORAGE_KEYS.CONFIG_SPREADSHEET_ID) &&
    !envValue('VITE_GOOGLE_CONFIG_SPREADSHEET_ID')
  ) {
    localStorage.setItem(STORAGE_KEYS.CONFIG_SPREADSHEET_ID, spreadsheetId.trim());
  }
  if (salesAccount !== undefined) writeConfigValue(STORAGE_KEYS.SALES_GOOGLE_ACCOUNT, salesAccount);
  if (trainingAccount !== undefined) writeConfigValue(STORAGE_KEYS.TRAINING_GOOGLE_ACCOUNT, trainingAccount);
  if (employeesAccount !== undefined) writeConfigValue(STORAGE_KEYS.EMPLOYEES_GOOGLE_ACCOUNT, employeesAccount);
  if (calendarId) localStorage.setItem(STORAGE_KEYS.CALENDAR_ID, calendarId.trim());
  applyWorkbookOverride({
    spreadsheetId: spreadsheetId ?? workbookOverride.spreadsheetId,
    trainingSpreadsheetId: trainingSpreadsheetId ?? workbookOverride.trainingSpreadsheetId,
    employeesSpreadsheetId: employeesSpreadsheetId ?? workbookOverride.employeesSpreadsheetId,
    salesAccount: salesAccount ?? workbookOverride.salesAccount,
    trainingAccount: trainingAccount ?? workbookOverride.trainingAccount,
    employeesAccount: employeesAccount ?? workbookOverride.employeesAccount,
  });
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

export const getEmployeesSpreadsheetId = () => getConfig().employeesSpreadsheetId || getConfig().trainingSpreadsheetId;

export const getConfigSpreadsheetId = () => getConfig().configSpreadsheetId;

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

const isConfigSpreadsheetUrl = (url) => {
  const id = envValue('VITE_GOOGLE_CONFIG_SPREADSHEET_ID') || HARDCODED_CONFIG_SPREADSHEET_ID;
  if (!id) return false;
  const text = String(url || '');
  return text.includes(`/spreadsheets/${id}`) || text.includes(`/files/${id}`);
};

const realAccessToken = () => {
  const token = getAccessToken();
  if (!token || token === 'demo-token') return '';
  return token;
};

const TOKEN_REFRESH_BUFFER_MS = 60 * 1000;

const isCalendarApiUrl = (url) => String(url || '').includes('googleapis.com/calendar/');

export const isAccessTokenExpired = () => {
  if (!realAccessToken()) return true;
  const exp = Number(sessionStorage.getItem(STORAGE_KEYS.TOKEN_EXP) || 0);
  return !exp || exp - TOKEN_REFRESH_BUFFER_MS <= Date.now();
};

const persistAccessToken = (token, expiresIn) => {
  setAccessToken(token);
  const ttlMs = Number(expiresIn || 3600) * 1000;
  sessionStorage.setItem(STORAGE_KEYS.TOKEN_EXP, String(Date.now() + ttlMs));
};

const requestGoogleAccessToken = (prompt) =>
  new Promise((resolve, reject) => {
    const clientId = getConfig().clientId;
    const oauth = window.google?.accounts?.oauth2;
    if (!clientId || !oauth) {
      reject(new Error('Google Calendar sign-in expired. Sign in again, then add the session.'));
      return;
    }
    const client = oauth.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (response) => {
        if (response?.error || !response?.access_token) {
          reject(new Error('Google Calendar sign-in expired. Sign in again, then add the session.'));
          return;
        }
        resolve(response);
      },
      error_callback: () => {
        reject(new Error('Google Calendar sign-in expired. Sign in again, then add the session.'));
      },
    });
    client.requestAccessToken({ prompt });
  });

export const ensureAccessToken = async ({ force = false } = {}) => {
  if (isDemoMode()) return realAccessToken() || 'demo-token';
  if (!force && !isAccessTokenExpired()) return realAccessToken();
  try {
    const response = await requestGoogleAccessToken('');
    persistAccessToken(response.access_token, response.expires_in);
    return response.access_token;
  } catch {
    const response = await requestGoogleAccessToken('consent');
    persistAccessToken(response.access_token, response.expires_in);
    return response.access_token;
  }
};

export const hasGoogleSheetAccess = () => Boolean(realAccessToken()) || isAppSheetsEnabled();

const readConfigSheetResponse = async (response) => {
  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) {
    throw new Error(data.error || 'Could not load the configuration spreadsheet.');
  }
  return data;
};

export const fetchPublicWorkbookConfig = async () => {
  const response = await fetch('/api/config-sheet');
  return readConfigSheetResponse(response);
};

export const savePublicWorkbookConfig = async (values) => {
  const response = await fetch('/api/config-sheet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values }),
  });
  return readConfigSheetResponse(response);
};

export const googleFetch = async (url, options = {}, retried = false) => {
  const token = realAccessToken();
  const configUrl = isConfigSpreadsheetUrl(url);
  const useAppSheets = isAppSheetsEnabled() && isAppSheetsUrl(url) && Boolean(token || configUrl);
  if (!useAppSheets && !token) {
    throw new Error(
      configUrl
        ? 'LocalStorage mode cannot open the configuration spreadsheet. Add the JSON key for crm-271@pappyjoe-crm.iam.gserviceaccount.com as GOOGLE_SERVICE_ACCOUNT_FILE, and share the configuration sheet with that email as Editor.'
        : 'Not signed in.'
    );
  }
  const response = useAppSheets
    ? await fetch(sheetsProxyUrl(), {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });
  if (!response.ok) {
    if (!retried && response.status === 401 && isCalendarApiUrl(url)) {
      await ensureAccessToken({ force: true });
      return googleFetch(url, options, true);
    }
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

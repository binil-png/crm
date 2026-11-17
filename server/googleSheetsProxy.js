import { createSign } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SHEETS_SCOPE = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
].join(' ');

const isFilled = (value) => {
  const text = String(value || '').trim();
  return Boolean(text) && !text.startsWith('your-');
};

const normalizeKey = (value) => String(value || '').replace(/\\n/g, '\n').trim();

const parseJson = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const loadServiceAccount = (env = process.env) => {
  const file = String(env.GOOGLE_SERVICE_ACCOUNT_FILE || '').trim();
  if (file) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) {
      throw new Error(`Service account file was not found: ${path}`);
    }
    const parsed = parseJson(readFileSync(path, 'utf8'));
    if (!parsed?.client_email || !parsed?.private_key) {
      throw new Error('Service account JSON must include client_email and private_key.');
    }
    return { email: parsed.client_email, key: normalizeKey(parsed.private_key) };
  }

  const inline = String(env.GOOGLE_SERVICE_ACCOUNT_JSON || '').trim();
  if (inline) {
    const parsed = parseJson(inline);
    if (!parsed?.client_email || !parsed?.private_key) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON must be the full Google JSON key.');
    }
    return { email: parsed.client_email, key: normalizeKey(parsed.private_key) };
  }

  const email = String(env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
  const key = normalizeKey(env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
  if (email && key) return { email, key };
  return null;
};

const allowedSpreadsheetIds = (env = process.env) =>
  new Set(
    [
      env.VITE_GOOGLE_SPREADSHEET_ID,
      env.VITE_GOOGLE_TRAINING_SPREADSHEET_ID,
      env.GOOGLE_SPREADSHEET_ID,
      env.GOOGLE_TRAINING_SPREADSHEET_ID,
    ]
      .map((value) => String(value || '').trim())
      .filter(isFilled)
  );

export const getSheetsAppStatus = (env = process.env) => {
  try {
    const account = loadServiceAccount(env);
    if (!account) return { enabled: false, shareWith: '' };
    return { enabled: true, shareWith: account.email };
  } catch (error) {
    return { enabled: false, shareWith: '', error: error.message };
  }
};

const b64url = (value) => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');

const signJwt = (email, key) => {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url({
    iss: email,
    sub: email,
    scope: SHEETS_SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${signer.sign(key, 'base64url')}`;
};

let tokenCache = { token: '', exp: 0, email: '' };

const getServiceToken = async (env) => {
  const account = loadServiceAccount(env);
  if (!account) {
    throw new Error(
      'App-level Sheets access is not configured. Add GOOGLE_SERVICE_ACCOUNT_FILE (JSON key) in .env, then share both CRM sheets with that service account as Editor.'
    );
  }
  if (tokenCache.token && tokenCache.email === account.email && tokenCache.exp > Date.now() + 60_000) {
    return tokenCache.token;
  }
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signJwt(account.email, account.key),
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Could not mint a service account token.');
  }
  tokenCache = {
    token: data.access_token,
    email: account.email,
    exp: Date.now() + Number(data.expires_in || 3600) * 1000,
  };
  return tokenCache.token;
};

const spreadsheetIdFromUrl = (url) => {
  try {
    const parsed = new URL(url);
    const sheets = parsed.pathname.match(/\/spreadsheets\/([a-zA-Z0-9-_]+)/);
    if (sheets) return sheets[1];
    const drive = parsed.pathname.match(/\/files\/([a-zA-Z0-9-_]+)/);
    if (drive) return drive[1];
  } catch {
    return '';
  }
  return '';
};

const isAllowedGoogleUrl = (url, env) => {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const hostPath = `${parsed.origin}${parsed.pathname}`;
  const sheets = hostPath.startsWith('https://sheets.googleapis.com/v4/spreadsheets/');
  const drive = hostPath.startsWith('https://www.googleapis.com/drive/v3/files/');
  if (!sheets && !drive) return false;
  const allowed = allowedSpreadsheetIds(env);
  const spreadsheetId = spreadsheetIdFromUrl(url);
  return Boolean(spreadsheetId && allowed.has(spreadsheetId));
};

const verifyUser = async (authorization) => {
  const token = String(authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  const profile = await response.json().catch(() => ({}));
  const email = String(profile.email || '').trim().toLowerCase();
  return email ? { email } : null;
};

const readJsonBody = (req) =>
  new Promise((resolveBody, reject) => {
    if (req.body && typeof req.body === 'object') {
      resolveBody(req.body);
      return;
    }
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolveBody(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });

const proxyGoogle = async (env, payload) => {
  const url = String(payload.url || '').trim();
  const method = String(payload.method || 'GET').toUpperCase();
  if (!isAllowedGoogleUrl(url, env)) {
    return {
      status: 400,
      body: { error: 'That Google URL is not one of the CRM spreadsheets configured in .env.' },
    };
  }
  const token = await getServiceToken(env);
  const googleBody =
    payload.body == null ? undefined : typeof payload.body === 'string' ? payload.body : JSON.stringify(payload.body);
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(googleBody ? { 'Content-Type': 'application/json' } : {}),
    },
    body: method === 'GET' || method === 'HEAD' ? undefined : googleBody,
  });
  const text = await response.text();
  let body = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: text };
    }
  }
  if (!response.ok) {
    const account = getSheetsAppStatus(env);
    const googleMessage = body.error?.message || body.error || response.statusText;
    return {
      status: response.status,
      body: {
        error:
          response.status === 403
            ? `The CRM service account cannot edit this Google Sheet. Open the sheet → Share → add ${account.shareWith || 'the service account'} as Editor. Google said: ${googleMessage}`
            : googleMessage,
      },
    };
  }
  return { status: response.status === 204 ? 204 : 200, body };
};

export const handleSheetsHttp = async (req, env = process.env) => {
  const method = req.method || 'GET';
  if (method === 'OPTIONS') return { status: 204, body: {} };
  if (method === 'GET') return { status: 200, body: getSheetsAppStatus(env) };
  if (method !== 'POST') return { status: 405, body: { error: 'Use GET or POST.' } };

  const user = await verifyUser(req.headers.authorization || req.headers.Authorization);
  if (!user) return { status: 401, body: { error: 'Sign in with Google first.' } };

  try {
    const payload = await readJsonBody(req);
    return await proxyGoogle(env, payload);
  } catch (error) {
    return { status: 400, body: { error: error.message || 'Sheets proxy request failed.' } };
  }
};

export const attachSheetsApi = (middlewares, env) => {
  middlewares.use(async (req, res, next) => {
    const path = req.url?.split('?')[0];
    if (path !== '/api/sheets') {
      next();
      return;
    }
    const result = await handleSheetsHttp(req, env);
    res.statusCode = result.status;
    if (result.status !== 204) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(result.body ?? {}));
      return;
    }
    res.end();
  });
};

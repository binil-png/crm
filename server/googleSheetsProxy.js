import { exec } from 'node:child_process';
import { createHash, createHmac, createSign } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const SHEETS_SCOPE = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
].join(' ');

const HARDCODED_CONFIG_SPREADSHEET_ID = '16O-ay51W8RFyTNS-lokAciuAkxj_P5r9hbqWuefz45s';
const HARDCODED_SERVICE_ACCOUNT_EMAIL = 'crm-271@pappyjoe-crm.iam.gserviceaccount.com';

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

const accountFromJson = (parsed, source) => {
  if (!parsed?.client_email || !parsed?.private_key) {
    throw new Error(`Service account JSON from ${source} must include client_email and private_key.`);
  }
  return { email: parsed.client_email, key: normalizeKey(parsed.private_key) };
};

const parseHttpsS3Url = (url) => {
  const text = String(url || '').trim();
  const virtual = text.match(/^https:\/\/(.+)\.s3\.([a-z0-9-]+)\.amazonaws\.com\/(.+)$/i);
  if (virtual) {
    const key = decodeURIComponent(virtual[3].split('?')[0]);
    return { bucket: virtual[1], key, region: virtual[2], uri: `s3://${virtual[1]}/${key}`, httpsUrl: text };
  }
  const pathStyle = text.match(/^https:\/\/s3[.-]([a-z0-9-]+)\.amazonaws\.com\/([^/]+)\/(.+)$/i);
  if (pathStyle) {
    const key = decodeURIComponent(pathStyle[3].split('?')[0]);
    return { bucket: pathStyle[2], key, region: pathStyle[1], uri: `s3://${pathStyle[2]}/${key}`, httpsUrl: text };
  }
  return { httpsUrl: text, uri: '', bucket: '', key: '', region: '' };
};

const parseS3Location = (env = process.env) => {
  const uri = String(env.GOOGLE_SERVICE_ACCOUNT_S3_URI || env.GOOGLE_SERVICE_ACCOUNT_S3_URL || '').trim();
  if (/^s3:\/\//i.test(uri)) {
    const fromUri = uri.match(/^s3:\/\/([^/]+)\/(.+)$/i);
    if (fromUri) return { bucket: fromUri[1], key: fromUri[2], uri: `s3://${fromUri[1]}/${fromUri[2]}` };
  }
  if (/^https?:\/\//i.test(uri)) return parseHttpsS3Url(uri);
  const bucket = String(env.GOOGLE_SERVICE_ACCOUNT_S3_BUCKET || '').trim();
  const key = String(env.GOOGLE_SERVICE_ACCOUNT_S3_KEY || '').trim();
  if (bucket && key) return { bucket, key, uri: `s3://${bucket}/${key}` };
  return null;
};

const sha256Hex = (value) => createHash('sha256').update(value, 'utf8').digest('hex');
const hmac = (key, value) => createHmac('sha256', key).update(value, 'utf8').digest();

const iniValue = (block, name) => {
  const match = String(block || '').match(new RegExp(`^${name}\\s*=\\s*(.+)$`, 'im'));
  return match ? match[1].trim() : '';
};

const readAwsProfile = (profile = 'default') => {
  try {
    const creds = readFileSync(join(homedir(), '.aws', 'credentials'), 'utf8');
    const section = creds.match(new RegExp(`\\[${profile}\\]([\\s\\S]*?)(?=\\[|$)`));
    return {
      id: iniValue(section?.[1], 'aws_access_key_id'),
      secret: iniValue(section?.[1], 'aws_secret_access_key'),
      token: iniValue(section?.[1], 'aws_session_token'),
    };
  } catch {
    return { id: '', secret: '', token: '' };
  }
};

const loadAwsCredentials = (env = process.env) => {
  const id = String(env.AWS_ACCESS_KEY_ID || '').trim() || readAwsProfile().id;
  const secret = String(env.AWS_SECRET_ACCESS_KEY || '').trim() || readAwsProfile().secret;
  const token = String(env.AWS_SESSION_TOKEN || '').trim() || readAwsProfile().token;
  const region = String(env.AWS_REGION || env.AWS_DEFAULT_REGION || '').trim();
  if (!id || !secret) return null;
  return { id, secret, token, region };
};

const signedS3Get = async (location, credentials) => {
  const region = location.region || credentials.region || 'ap-south-1';
  const host = `${location.bucket}.s3.${region}.amazonaws.com`;
  const canonicalKey = location.key.split('/').map(encodeURIComponent).join('/');
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex('');
  const extra = credentials.token ? `x-amz-security-token:${credentials.token}\n` : '';
  const signedHeaders = credentials.token
    ? 'host;x-amz-content-sha256;x-amz-date;x-amz-security-token'
    : 'host;x-amz-content-sha256;x-amz-date';
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n${extra}`;
  const canonicalRequest = `GET\n/${canonicalKey}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${sha256Hex(canonicalRequest)}`;
  const kDate = hmac(`AWS4${credentials.secret}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');
  const response = await fetch(`https://${host}/${canonicalKey}`, {
    headers: {
      host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      ...(credentials.token ? { 'x-amz-security-token': credentials.token } : {}),
      Authorization: `AWS4-HMAC-SHA256 Credential=${credentials.id}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Signed S3 GET failed (${response.status}).`);
  }
  return parseJson(text);
};

const loadJsonFromHttps = async (url) => {
  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Could not download service account JSON from HTTPS (${response.status}).`);
  }
  return parseJson(text);
};

const loadJsonFromS3Cli = async (location) => {
  const command = `aws s3 cp "${location.uri}" -`;
  try {
    const { stdout } = await execAsync(command, {
      maxBuffer: 2 * 1024 * 1024,
      env: process.env,
    });
    return parseJson(stdout);
  } catch (error) {
    const detail = String(error.stderr || error.message || error);
    throw new Error(`AWS CLI s3 cp failed. ${detail}`);
  }
};

const loadRemoteServiceAccountJson = async (location, env = process.env) => {
  const errors = [];
  if (location.httpsUrl) {
    try {
      return await loadJsonFromHttps(location.httpsUrl);
    } catch (error) {
      errors.push(error.message);
    }
  }
  const credentials = loadAwsCredentials(env);
  if (credentials && location.bucket && location.key) {
    try {
      return await signedS3Get(location, credentials);
    } catch (error) {
      errors.push(error.message);
    }
  }
  if (location.uri) {
    try {
      return await loadJsonFromS3Cli(location);
    } catch (error) {
      errors.push(error.message);
    }
  }
  throw new Error(
    `S3 blocked the JSON (private object). HTTPS 403, no AWS_ACCESS_KEY_ID in .env, and AWS CLI is not installed. Download the file from the S3 console and set GOOGLE_SERVICE_ACCOUNT_FILE=./secrets/pappyjoe-crm-c1ce8651f5b1.json, or add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to .env with s3:GetObject on ${location.uri || location.httpsUrl}.`
  );
};

let accountCache = { fingerprint: '', account: null };

const accountFingerprint = (env) =>
  [
    env.GOOGLE_SERVICE_ACCOUNT_FILE,
    env.GOOGLE_SERVICE_ACCOUNT_S3_URI,
    env.GOOGLE_SERVICE_ACCOUNT_S3_BUCKET,
    env.GOOGLE_SERVICE_ACCOUNT_S3_KEY,
    env.GOOGLE_SERVICE_ACCOUNT_S3_URL,
    env.GOOGLE_SERVICE_ACCOUNT_JSON,
    env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64,
    env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  ].join('|');

const serviceAccountFileCandidates = (env = process.env) => {
  const files = [];
  const fromEnv = String(env.GOOGLE_SERVICE_ACCOUNT_FILE || '').trim();
  if (fromEnv) files.push(fromEnv.startsWith('/') ? fromEnv : resolve(process.cwd(), fromEnv));
  files.push('/etc/secrets/credentials.json');
  files.push('/etc/secrets/google-service-account.json');
  files.push(resolve(process.cwd(), 'credentials.json'));
  files.push(resolve(process.cwd(), 'secrets/pappyjoe-crm-c1ce8651f5b1.json'));
  return [...new Set(files)];
};

const loadServiceAccount = async (env = process.env) => {
  const fingerprint = accountFingerprint(env);
  if (accountCache.fingerprint === fingerprint && accountCache.account) return accountCache.account;

  const fromBase64 = String(env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 || '').trim();
  if (fromBase64) {
    const decoded = Buffer.from(fromBase64, 'base64').toString('utf8');
    const account = accountFromJson(parseJson(decoded), 'GOOGLE_SERVICE_ACCOUNT_JSON_BASE64');
    accountCache = { fingerprint, account };
    return account;
  }

  for (const path of serviceAccountFileCandidates(env)) {
    if (!existsSync(path)) continue;
    const account = accountFromJson(parseJson(readFileSync(path, 'utf8')), path);
    accountCache = { fingerprint, account };
    return account;
  }

  const s3Location = parseS3Location(env);
  if (s3Location) {
    const account = accountFromJson(
      await loadRemoteServiceAccountJson(s3Location, env),
      s3Location.httpsUrl || s3Location.uri
    );
    accountCache = { fingerprint, account };
    return account;
  }

  const inline = String(env.GOOGLE_SERVICE_ACCOUNT_JSON || '').trim();
  if (inline) {
    const account = accountFromJson(parseJson(inline), 'GOOGLE_SERVICE_ACCOUNT_JSON');
    accountCache = { fingerprint, account };
    return account;
  }

  const email = String(env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
  const key = normalizeKey(env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
  if (email && key) {
    const account = { email, key };
    accountCache = { fingerprint, account };
    return account;
  }
  return null;
};

const allowedSpreadsheetIds = (env = process.env) =>
  new Set(
    [
      env.VITE_GOOGLE_SPREADSHEET_ID,
      env.VITE_GOOGLE_TRAINING_SPREADSHEET_ID,
      env.VITE_GOOGLE_EMPLOYEES_SPREADSHEET_ID,
      env.VITE_GOOGLE_CONFIG_SPREADSHEET_ID,
      HARDCODED_CONFIG_SPREADSHEET_ID,
      env.GOOGLE_SPREADSHEET_ID,
      env.GOOGLE_TRAINING_SPREADSHEET_ID,
      env.GOOGLE_EMPLOYEES_SPREADSHEET_ID,
      env.GOOGLE_CONFIG_SPREADSHEET_ID,
      ...(String(env.GOOGLE_ALLOWED_SPREADSHEET_IDS || '')
        .split(',')
        .map((value) => value.trim())),
    ]
      .map((value) => String(value || '').trim())
      .filter(isFilled)
  );

export const getSheetsAppStatus = async (env = process.env) => {
  try {
    const account = await loadServiceAccount(env);
    if (!account) {
      return {
        enabled: false,
        shareWith: String(env.GOOGLE_SERVICE_ACCOUNT_EMAIL || HARDCODED_SERVICE_ACCOUNT_EMAIL).trim(),
      };
    }
    return { enabled: true, shareWith: account.email };
  } catch (error) {
    return {
      enabled: false,
      shareWith: String(env.GOOGLE_SERVICE_ACCOUNT_EMAIL || HARDCODED_SERVICE_ACCOUNT_EMAIL).trim(),
      error: error.message,
    };
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
  const account = await loadServiceAccount(env);
  if (!account) {
    throw new Error(
      `App-level Sheets access is not configured. Set GOOGLE_SERVICE_ACCOUNT_S3_URI (s3://bucket/key.json) or GOOGLE_SERVICE_ACCOUNT_FILE for ${HARDCODED_SERVICE_ACCOUNT_EMAIL}, then share the configuration spreadsheet with that email as Editor.`
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

export const serviceAccountFetch = async (env, url, { method = 'GET', body } = {}) => {
  const token = await getServiceToken(env);
  const googleBody = body == null ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(googleBody ? { 'Content-Type': 'application/json' } : {}),
    },
    body: method === 'GET' || method === 'HEAD' ? undefined : googleBody,
  });
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }
  if (!response.ok) {
    const account = await getSheetsAppStatus(env);
    const googleMessage = data.error?.message || data.error || response.statusText;
    const shareWith = account.shareWith || HARDCODED_SERVICE_ACCOUNT_EMAIL;
    throw new Error(
      response.status === 403
        ? `Share the configuration spreadsheet with ${shareWith} as Editor. Google said: ${googleMessage}`
        : googleMessage
    );
  }
  return data;
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
  if (!spreadsheetId) return false;
  if (allowed.size === 0 || allowed.has(spreadsheetId)) return true;
  return Boolean(spreadsheetId);
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
    const account = await getSheetsAppStatus(env);
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
  if (method === 'GET') return { status: 200, body: await getSheetsAppStatus(env) };
  if (method !== 'POST') return { status: 405, body: { error: 'Use GET or POST.' } };

  try {
    const payload = await readJsonBody(req);
    const user = await verifyUser(req.headers.authorization || req.headers.Authorization);
    const configId = String(
      env.VITE_GOOGLE_CONFIG_SPREADSHEET_ID || env.GOOGLE_CONFIG_SPREADSHEET_ID || HARDCODED_CONFIG_SPREADSHEET_ID || ''
    ).trim();
    const targetId = spreadsheetIdFromUrl(payload.url);
    const configOnly = Boolean(configId && targetId === configId);
    if (!user && !configOnly) {
      return { status: 401, body: { error: 'Sign in with Google first.' } };
    }
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

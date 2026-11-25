import { getSheetsAppStatus, serviceAccountFetch } from './googleSheetsProxy.js';

const HARDCODED_CONFIG_SPREADSHEET_ID = '16O-ay51W8RFyTNS-lokAciuAkxj_P5r9hbqWuefz45s';
const HARDCODED_SERVICE_ACCOUNT_EMAIL = 'crm-271@pappyjoe-crm.iam.gserviceaccount.com';
const WORKBOOK_CONFIG_TAB = 'Workbook_Config';

const isFilled = (value) => {
  const text = String(value || '').trim();
  return Boolean(text) && !text.startsWith('your-');
};

export const resolveConfigSpreadsheetId = (env = process.env) => {
  const fromEnv = String(env.VITE_GOOGLE_CONFIG_SPREADSHEET_ID || env.GOOGLE_CONFIG_SPREADSHEET_ID || '').trim();
  return isFilled(fromEnv) ? fromEnv : HARDCODED_CONFIG_SPREADSHEET_ID;
};

const serviceAccountEmail = (env = process.env) =>
  String(env.GOOGLE_SERVICE_ACCOUNT_EMAIL || HARDCODED_SERVICE_ACCOUNT_EMAIL).trim();

const missingKeyError = (env) =>
  new Error(
    `Set GOOGLE_SERVICE_ACCOUNT_S3_URI (s3://bucket/path.json) or GOOGLE_SERVICE_ACCOUNT_FILE for ${serviceAccountEmail(
      env
    )}, then share the configuration spreadsheet with that email as Editor.`
  );

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

const requireServiceAccount = async (env) => {
  const status = await getSheetsAppStatus(env);
  if (!status.enabled) throw new Error(status.error || missingKeyError(env).message);
  return status;
};

const ensureConfigTab = async (env, spreadsheetId) => {
  const meta = await serviceAccountFetch(
    env,
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`
  );
  const titles = (meta.sheets || []).map((sheet) => sheet.properties?.title);
  if (titles.includes(WORKBOOK_CONFIG_TAB)) return;
  await serviceAccountFetch(env, `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: {
      requests: [{ addSheet: { properties: { title: WORKBOOK_CONFIG_TAB, gridProperties: { frozenRowCount: 1 } } } }],
    },
  });
};

export const fetchPublicWorkbookConfig = async (env = process.env) => {
  await requireServiceAccount(env);
  const spreadsheetId = resolveConfigSpreadsheetId(env);
  await ensureConfigTab(env, spreadsheetId);
  const data = await serviceAccountFetch(
    env,
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`${WORKBOOK_CONFIG_TAB}!A:E`)}`
  );
  return { spreadsheetId, values: data.values || [] };
};

const writeWorkbookConfigValues = async (env, values) => {
  await requireServiceAccount(env);
  const spreadsheetId = resolveConfigSpreadsheetId(env);
  await ensureConfigTab(env, spreadsheetId);
  await serviceAccountFetch(
    env,
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      `${WORKBOOK_CONFIG_TAB}!A1:E4`
    )}?valueInputOption=USER_ENTERED`,
    { method: 'PUT', body: { values } }
  );
  return { spreadsheetId, values };
};

export const handleConfigSheetHttp = async (req, env = process.env) => {
  const method = req.method || 'GET';
  if (method === 'OPTIONS') return { status: 204, body: {} };
  try {
    if (method === 'GET') {
      const data = await fetchPublicWorkbookConfig(env);
      return { status: 200, body: data };
    }
    if (method === 'POST') {
      const payload = await readJsonBody(req);
      const values = Array.isArray(payload.values) ? payload.values : [];
      if (!values.length) {
        return { status: 400, body: { error: 'Workbook_Config values are required.' } };
      }
      const data = await writeWorkbookConfigValues(env, values);
      return { status: 200, body: data };
    }
    return { status: 405, body: { error: 'Use GET or POST.' } };
  } catch (error) {
    return { status: 400, body: { error: error.message || 'Could not load the configuration spreadsheet.' } };
  }
};

export const attachConfigSheetApi = (middlewares, env) => {
  middlewares.use(async (req, res, next) => {
    const path = req.url?.split('?')[0];
    if (path !== '/api/config-sheet') {
      next();
      return;
    }
    const result = await handleConfigSheetHttp(req, env);
    res.statusCode = result.status;
    if (result.status !== 204) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(result.body ?? {}));
      return;
    }
    res.end();
  });
};

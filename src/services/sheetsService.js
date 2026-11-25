import {
  HEADERS,
  INTERACTION_HEADERS,
  LEAD_HEADERS,
  SHEETS,
  SYSTEM_SHEETS,
  TRAINING_WORKBOOK_SHEETS,
  WORKBOOK_KEYS,
  appendStageComment,
  isLeadHeaderRow,
  normalizeStatus,
  nowIso,
  objectToRow,
  parseSpreadsheetId,
  rowsToObjects,
  sameDay,
} from '../utils/constants';
import {
  applyWorkbookOverride,
  fetchPublicWorkbookConfig,
  savePublicWorkbookConfig,
  getAppSheetsStatus,
  getConfig,
  getConfigSpreadsheetId,
  getEmployeesSpreadsheetId,
  getSpreadsheetId,
  getTrainingSpreadsheetId,
  googleFetch,
  hasGoogleSheetAccess,
  isAppSheetsEnabled,
  isDemoMode,
  isGapiReady,
  refreshAppSheetsStatus,
  saveConfig,
} from './googleApi';
import * as mock from './mockBackend';

const SYSTEM_TITLES = new Set([
  ...Object.values(SYSTEM_SHEETS),
  SHEETS.NO_RESPONSE,
  SHEETS.CLIENTS,
  SHEETS.SESSIONS,
  SHEETS.LOGS,
  SHEETS.USERS,
]);

const a1 = (sheet, range) => {
  const quoted = /[^A-Za-z0-9_]/.test(sheet) ? `'${sheet.replace(/'/g, "''")}'` : sheet;
  return `${quoted}!${range}`;
};

const TRAINING_TITLES = new Set(TRAINING_WORKBOOK_SHEETS);

const requireId = (spreadsheetId, label) => {
  if (!spreadsheetId) throw new Error(`${label} spreadsheet ID is missing.`);
  return spreadsheetId;
};

const salesId = () => requireId(getSpreadsheetId(), 'Sales');
const trainingId = () => requireId(getTrainingSpreadsheetId(), 'Training');
const employeesId = () => requireId(getConfig().employeesSpreadsheetId, 'User details');
const configId = () => requireId(getConfigSpreadsheetId(), 'Config');
const idForSheet = (sheetName) => {
  if (sheetName === SHEETS.USERS) return employeesId();
  if (sheetName === SHEETS.WORKBOOK_CONFIG) return configId();
  return TRAINING_TITLES.has(sheetName) ? trainingId() : salesId();
};

const sheetUrl = (path = '', spreadsheetId = salesId()) =>
  `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}${path}`;

const METADATA_TTL_MS = 5 * 60 * 1000;
const metadataCache = new Map();

export const sheetsErrorMessage = (error) =>
  error?.result?.error?.message || error?.message || 'Google Sheets request failed.';

export const isSheetsQuotaError = (error) => {
  const text = sheetsErrorMessage(error);
  const code = error?.status || error?.result?.error?.code;
  return code === 429 || /quota exceeded|rate limit exceeded/i.test(text);
};

export const isPermissionError = (error) => {
  const text = sheetsErrorMessage(error);
  const code = error?.status || error?.result?.error?.code;
  return code === 403 || /PERMISSION_DENIED|caller does not have permission|insufficient permission|forbidden/i.test(text);
};

export const isSheetsApiDisabledError = (error) =>
  /has not been used in project|accessNotConfigured|API has not been enabled|it is disabled/i.test(
    sheetsErrorMessage(error)
  );

export const isNotFoundError = (error) => {
  const text = sheetsErrorMessage(error);
  const code = error?.status || error?.result?.error?.code;
  return code === 404 || /requested entity was not found/i.test(text);
};

const missingSpreadsheetError = (label, spreadsheetId) =>
  new Error(
    `The ${label} spreadsheet was not found${spreadsheetId ? ` (${spreadsheetId})` : ''}. Open the configuration sheet, confirm that ID, and share the spreadsheet with your Google account as Editor.`
  );

const withNotFound = async (label, spreadsheetId, fn) => {
  if (!spreadsheetId) throw new Error(`${label} spreadsheet ID is missing in Workbook_Config.`);
  try {
    return await fn();
  } catch (error) {
    if (isNotFoundError(error)) throw missingSpreadsheetError(label, spreadsheetId);
    throw error;
  }
};

const shareHelp = (spreadsheetId, label, email = '') => {
  const url = spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : '';
  const app = getAppSheetsStatus();
  if (app.enabled && app.shareWith) {
    return `The CRM app cannot edit the ${label} sheet. Open ${url} → Share → add the service account ${app.shareWith} as Editor (once). Signed-in Gmail accounts do not need to be on the sheet.`;
  }
  const who = email ? email : 'the Gmail used in Continue with Google';
  return `Google blocked writes to the ${label} sheet for ${who}. Open ${url} as the sheet owner → Share → add ${who} as Editor (not Viewer) → Send. Or give the CRM app-level access: create a Google service account, put GOOGLE_SERVICE_ACCOUNT_FILE in .env, and share the sheet with that service account as Editor.`;
};

const describeSheetWriteError = (error, spreadsheetId, label, email) => {
  if (isSheetsApiDisabledError(error)) {
    return 'Enable Google Sheets API in Google Cloud Console (APIs & Services → Library → Google Sheets API → Enable) for the OAuth project, wait about a minute, then sign in again.';
  }
  if (isPermissionError(error)) return shareHelp(spreadsheetId, label, email);
  if (isNotFoundError(error)) return missingSpreadsheetError(label, spreadsheetId).message;
  return `${label}: ${sheetsErrorMessage(error)}`;
};

const useGapiSheets = () => isGapiReady() && !isAppSheetsEnabled();

const gapiCall = async (fn) => {
  try {
    return await fn();
  } catch (error) {
    throw new Error(sheetsErrorMessage(error));
  }
};

const invalidateSpreadsheetCache = (spreadsheetId) => {
  if (spreadsheetId) metadataCache.delete(spreadsheetId);
  else metadataCache.clear();
};

const getValues = async (range, spreadsheetId = salesId()) => {
  if (useGapiSheets()) {
    const response = await gapiCall(() =>
      window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      })
    );
    return response.result.values || [];
  }
  const data = await googleFetch(`${sheetUrl(`/values/${encodeURIComponent(range)}`, spreadsheetId)}`);
  return data.values || [];
};

const batchGetValues = async (ranges, spreadsheetId = salesId()) => {
  const list = ranges.filter(Boolean);
  if (!list.length) return [];
  if (useGapiSheets()) {
    const response = await gapiCall(() =>
      window.gapi.client.sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges: list,
      })
    );
    return (response.result.valueRanges || []).map((item) => item.values || []);
  }
  const query = list.map((range) => `ranges=${encodeURIComponent(range)}`).join('&');
  const data = await googleFetch(`${sheetUrl('/values:batchGet', spreadsheetId)}?${query}`);
  return (data.valueRanges || []).map((item) => item.values || []);
};

const appendValues = async (range, values, spreadsheetId = salesId()) => {
  if (useGapiSheets()) {
    await gapiCall(() =>
      window.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: { values },
      })
    );
    return;
  }
  await googleFetch(
    `${sheetUrl(`/values/${encodeURIComponent(range)}:append`, spreadsheetId)}?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: 'POST', body: JSON.stringify({ values }) }
  );
};

const updateValues = async (range, values, spreadsheetId = salesId()) => {
  if (useGapiSheets()) {
    await gapiCall(() =>
      window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        resource: { values },
      })
    );
    return;
  }
  await googleFetch(
    `${sheetUrl(`/values/${encodeURIComponent(range)}`, spreadsheetId)}?valueInputOption=USER_ENTERED`,
    { method: 'PUT', body: JSON.stringify({ values }) }
  );
};

const getSpreadsheet = async ({ force = false, spreadsheetId = salesId() } = {}) => {
  const cached = metadataCache.get(spreadsheetId);
  if (!force && cached && Date.now() - cached.at < METADATA_TTL_MS) return cached.data;
  const data = useGapiSheets()
    ? (
        await gapiCall(() =>
          window.gapi.client.sheets.spreadsheets.get({
            spreadsheetId,
          })
        )
      ).result
    : await googleFetch(sheetUrl('', spreadsheetId));
  metadataCache.set(spreadsheetId, { data, at: Date.now() });
  return data;
};

const sheetTitles = (spreadsheet) => (spreadsheet.sheets || []).map((sheet) => sheet.properties.title);

const batchUpdate = async (requests, spreadsheetId = salesId()) => {
  invalidateSpreadsheetCache(spreadsheetId);
  if (useGapiSheets()) {
    await gapiCall(() =>
      window.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: { requests },
      })
    );
    return;
  }
  await googleFetch(`${sheetUrl('', spreadsheetId)}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests }),
  });
};

const ensureSheetWithHeaders = async (existing, title, headers, firstRow, spreadsheetId = salesId()) => {
  if (!existing.has(title)) {
    await batchUpdate([{ addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } } }], spreadsheetId);
    existing.add(title);
    await updateValues(a1(title, 'A1'), [headers], spreadsheetId);
    return;
  }
  const first = firstRow || (await getValues(a1(title, '1:1'), spreadsheetId))[0] || [];
  const present = new Set(first.map((cell) => String(cell || '').trim()).filter(Boolean));
  const missing = headers.filter((header) => !present.has(header));
  if (!first.some((cell) => String(cell || '').trim())) {
    await updateValues(a1(title, 'A1'), [headers], spreadsheetId);
    return;
  }
  if (missing.length) {
    const next = [...first.map((cell) => String(cell || '').trim()).filter(Boolean), ...missing];
    await updateValues(a1(title, '1:1'), [next], spreadsheetId);
  }
};

const ensureRequiredSheets = async (spreadsheetId, required) => {
  const spreadsheet = await getSpreadsheet({ force: true, spreadsheetId });
  const existing = new Set(sheetTitles(spreadsheet));
  const existingRequired = required.filter(([title]) => existing.has(title));
  const headerRows = await batchGetValues(
    existingRequired.map(([title]) => a1(title, '1:1')),
    spreadsheetId
  );
  for (const [title, headers] of required) {
    const existingIndex = existingRequired.findIndex((item) => item[0] === title);
    const first = existingIndex >= 0 ? headerRows[existingIndex]?.[0] || [] : undefined;
    await ensureSheetWithHeaders(existing, title, headers, first, spreadsheetId);
  }
  return existing;
};

const columnLetter = (count) => {
  let n = Number(count) || 0;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters || 'A';
};

const canonicalUserHeader = (cell) => {
  const trimmed = String(cell || '').trim();
  const compact = trimmed.toLowerCase().replace(/[\s_-]+/g, '');
  if (compact === 'sheetname') return 'Sheet Name';
  return trimmed;
};

const resolveUserHeaders = (values) => {
  const first = (values[0] || []).map((cell) => canonicalUserHeader(cell));
  if (first.includes('Email') || first.includes('Username')) return first;
  return HEADERS[SHEETS.USERS];
};

const sheetNameFromUser = (row = {}) => String(row['Sheet Name'] || row.sheetName || '').trim();

const sheetNamesFromUsers = (users = []) => {
  const names = [];
  const seen = new Set();
  users.forEach((row) => {
    const name = sheetNameFromUser(row);
    if (!name || seen.has(name)) return;
    seen.add(name);
    names.push(name);
  });
  return names;
};

const matchWorkbookTitle = (name, titleSet) => {
  if (titleSet.has(name)) return name;
  const lower = String(name || '').toLowerCase();
  for (const title of titleSet) {
    if (String(title).toLowerCase() === lower) return title;
  }
  return '';
};

const namedLeadSheets = (users, titleSet) => {
  const names = [];
  const seen = new Set();
  sheetNamesFromUsers(users).forEach((name) => {
    const title = matchWorkbookTitle(name, titleSet);
    if (!title || seen.has(title)) return;
    seen.add(title);
    names.push(title);
  });
  return names;
};

const uniqueSheetNames = (...lists) => {
  const names = [];
  const seen = new Set();
  lists.flat().forEach((name) => {
    const title = String(name || '').trim();
    if (!title || seen.has(title)) return;
    seen.add(title);
    names.push(title);
  });
  return names;
};

const classifyLeadSheets = (titles, settingsRows, headerByTitle) => {
  const configured = (settingsRows || [])
    .slice(1)
    .map((row) => String(row[0] || '').trim())
    .filter(Boolean);

  const names = new Set();
  configured.forEach((name) => {
    if (titles.has(name) && !SYSTEM_TITLES.has(name)) names.add(name);
  });

  for (const title of titles) {
    if (SYSTEM_TITLES.has(title) && title !== SHEETS.NO_RESPONSE) continue;
    if (names.has(title)) continue;
    const first = headerByTitle.get(title) || [];
    if (isLeadHeaderRow(first) || title === SHEETS.NO_RESPONSE) names.add(title);
  }

  return [...names];
};

const workbookRow = (rows, ...names) =>
  rows.find((row) => names.includes(String(row.Workbook || '').trim())) || {};

const defaultWorkbookConfig = () => {
  const cfg = getConfig();
  return {
    salesAccount: cfg.salesAccount,
    spreadsheetId: cfg.spreadsheetId,
    trainingAccount: cfg.trainingAccount,
    trainingSpreadsheetId: cfg.trainingSpreadsheetId,
    employeesAccount: cfg.employeesAccount,
    employeesSpreadsheetId: cfg.employeesSpreadsheetId,
    configSpreadsheetId: cfg.configSpreadsheetId,
  };
};

const configFromRows = (rows) => {
  const sales = workbookRow(rows, WORKBOOK_KEYS.SALES);
  const training = workbookRow(rows, WORKBOOK_KEYS.TRAINING);
  const users = workbookRow(rows, WORKBOOK_KEYS.USERS, WORKBOOK_KEYS.EMPLOYEES, 'User details');
  return {
    salesAccount: String(sales['Google Account'] || '').trim(),
    spreadsheetId: parseSpreadsheetId(sales['Spreadsheet ID']) || getSpreadsheetId(),
    trainingAccount: String(training['Google Account'] || '').trim(),
    trainingSpreadsheetId: parseSpreadsheetId(training['Spreadsheet ID']) || getTrainingSpreadsheetId(),
    employeesAccount: String(users['Google Account'] || '').trim(),
    employeesSpreadsheetId: parseSpreadsheetId(users['Spreadsheet ID']) || getConfig().employeesSpreadsheetId || '',
  };
};

const persistWorkbookConfigLocally = (config) => {
  applyWorkbookOverride(config);
  saveConfig({
    ...config,
    configSpreadsheetId: config.configSpreadsheetId || getConfig().configSpreadsheetId,
  });
  return getConfig();
};

const workbookConfigValues = (config, userEmail) => {
  const at = nowIso();
  const by = String(userEmail || '').trim();
  return [
    HEADERS[SHEETS.WORKBOOK_CONFIG],
    [WORKBOOK_KEYS.SALES, config.salesAccount, config.spreadsheetId, at, by],
    [WORKBOOK_KEYS.TRAINING, config.trainingAccount, config.trainingSpreadsheetId, at, by],
    [WORKBOOK_KEYS.USERS, config.employeesAccount, config.employeesSpreadsheetId, at, by],
  ];
};

const writeWorkbookConfigSheet = async (config, userEmail) => {
  const host = configId();
  await ensureRequiredSheets(host, [[SHEETS.WORKBOOK_CONFIG, HEADERS[SHEETS.WORKBOOK_CONFIG]]]);
  await updateValues(a1(SHEETS.WORKBOOK_CONFIG, 'A1:E4'), workbookConfigValues(config, userEmail), host);
};

export const getWorkbookConfig = () => defaultWorkbookConfig();

const applyConfigValues = (values, host) => {
  const rows = rowsToObjects(values, HEADERS[SHEETS.WORKBOOK_CONFIG]);
  const config = rows.length ? configFromRows(rows) : defaultWorkbookConfig();
  persistWorkbookConfigLocally({ ...config, configSpreadsheetId: host });
  return getConfig();
};

export const loadWorkbookConfig = async () => {
  try {
    const publicData = await fetchPublicWorkbookConfig();
    const host = publicData.spreadsheetId || getConfigSpreadsheetId();
    return applyConfigValues(publicData.values || [], host);
  } catch (publicError) {
    if (!hasGoogleSheetAccess()) throw publicError;
    await refreshAppSheetsStatus();
    const host = configId();
    try {
      await ensureRequiredSheets(host, [[SHEETS.WORKBOOK_CONFIG, HEADERS[SHEETS.WORKBOOK_CONFIG]]]);
      const values = await getValues(a1(SHEETS.WORKBOOK_CONFIG, 'A:E'), host);
      const rows = rowsToObjects(values, HEADERS[SHEETS.WORKBOOK_CONFIG]);
      const config = rows.length ? configFromRows(rows) : defaultWorkbookConfig();
      if (!rows.length) {
        await updateValues(a1(SHEETS.WORKBOOK_CONFIG, 'A1:E4'), workbookConfigValues(config, ''), host);
      }
      persistWorkbookConfigLocally({ ...config, configSpreadsheetId: host });
      return getConfig();
    } catch (error) {
      if (isNotFoundError(error)) throw missingSpreadsheetError('configuration', host);
      if (isPermissionError(error)) throw new Error(shareHelp(host, 'configuration'));
      throw error;
    }
  }
};

export const saveWorkbookConfig = async (payload, userEmail) => {
  await refreshAppSheetsStatus();
  const configSpreadsheetId =
    parseSpreadsheetId(payload.configSpreadsheetId) || getConfigSpreadsheetId();
  if (configSpreadsheetId) {
    saveConfig({ configSpreadsheetId });
  }
  const spreadsheetId = parseSpreadsheetId(payload.spreadsheetId);
  const trainingSpreadsheetId = parseSpreadsheetId(payload.trainingSpreadsheetId);
  const employeesSpreadsheetId = parseSpreadsheetId(payload.employeesSpreadsheetId);
  if (!spreadsheetId) throw new Error('Sales spreadsheet ID is required.');
  if (!trainingSpreadsheetId) throw new Error('Training spreadsheet ID is required.');
  if (!employeesSpreadsheetId) throw new Error('User details spreadsheet ID is required.');
  const config = {
    salesAccount: String(payload.salesAccount || '').trim().toLowerCase(),
    spreadsheetId,
    trainingAccount: String(payload.trainingAccount || '').trim().toLowerCase(),
    trainingSpreadsheetId,
    employeesAccount: String(payload.employeesAccount || '').trim().toLowerCase(),
    employeesSpreadsheetId,
    configSpreadsheetId: configSpreadsheetId || getConfig().configSpreadsheetId,
  };
  persistWorkbookConfigLocally(config);
  await savePublicWorkbookConfig(workbookConfigValues(config, userEmail || 'localstorage'));
  if (isDemoMode()) {
    mock.mockSaveWorkbookConfig(config);
    return getConfig();
  }
  await ensureRequiredSheets(employeesId(), [[SHEETS.USERS, HEADERS[SHEETS.USERS]]]);
  await ensureWorkbook();
  return getConfig();
};

export const ensureWorkbook = async () => {
  if (isDemoMode()) return mock.mockEnsureWorkbook();

  const existing = await ensureRequiredSheets(salesId(), [
    [SHEETS.SETTINGS, HEADERS[SHEETS.SETTINGS]],
    [SHEETS.INTERACTIONS, INTERACTION_HEADERS],
    [SHEETS.AUDIT, HEADERS[SHEETS.AUDIT]],
  ]);

  await ensureRequiredSheets(trainingId(), [
    [SHEETS.CLIENTS, HEADERS[SHEETS.CLIENTS]],
    [SHEETS.SESSIONS, HEADERS[SHEETS.SESSIONS]],
    [SHEETS.LOGS, HEADERS[SHEETS.LOGS]],
  ]);
  await ensureRequiredSheets(configId(), [[SHEETS.WORKBOOK_CONFIG, HEADERS[SHEETS.WORKBOOK_CONFIG]]]);
  await ensureRequiredSheets(employeesId(), [[SHEETS.USERS, HEADERS[SHEETS.USERS]]]);

  const leadSheets = await listLeadSheetNames(existing);
  if (!leadSheets.length) {
    await ensureSheetWithHeaders(existing, 'SALES', LEAD_HEADERS, undefined, salesId());
    const settingsRows = await getValues(a1(SHEETS.SETTINGS, 'A:A'), salesId());
    if (settingsRows.length <= 1) {
      await updateValues(a1(SHEETS.SETTINGS, 'A1'), [['Active CRM Sheets'], ['SALES']], salesId());
    }
  }

  return true;
};

const listLeadSheetNames = async (existingTitles) => {
  const titles = existingTitles || new Set(sheetTitles(await getSpreadsheet({ spreadsheetId: salesId() })));
  const named = namedLeadSheets(await loadUsersSnapshot(), titles);
  if (named.length) return named;
  const candidates = [...titles].filter((title) => !SYSTEM_TITLES.has(title) || title === SHEETS.NO_RESPONSE);
  const ranges = [titles.has(SHEETS.SETTINGS) ? a1(SHEETS.SETTINGS, 'A:A') : null, ...candidates.map((title) => a1(title, '1:1'))].filter(
    Boolean
  );
  const rows = ranges.length ? await batchGetValues(ranges, salesId()) : [];
  let offset = 0;
  const settingsRows = titles.has(SHEETS.SETTINGS) ? rows[offset++] || [] : [];
  const headerByTitle = new Map(candidates.map((title, index) => [title, rows[offset + index]?.[0] || []]));
  return classifyLeadSheets(titles, settingsRows, headerByTitle);
};

const leadObjectsFromSheet = async (sheetName) => {
  const values = await getValues(a1(sheetName, 'A:Q'), salesId());
  return rowsToObjects(values, LEAD_HEADERS).map((lead) => ({
    ...lead,
    Status: normalizeStatus(lead.Status),
    _sheet: sheetName,
  }));
};

export const getLeadSheets = async () => {
  if (isDemoMode()) return mock.mockGetLeadSheets();
  return listLeadSheetNames();
};

export const loadCrmSnapshot = async () => {
  if (isDemoMode()) {
    const users = (await mock.mockGetObjects(SHEETS.USERS)).map(toDirectoryUser);
    const allLeads = await mock.mockGetLeads();
    const allSheets = await mock.mockGetLeadSheets();
    const namedSheets = namedLeadSheets(users, new Set(allSheets));
    const leadSheets = namedSheets.length ? namedSheets : allSheets;
    return {
      leads: namedSheets.length ? allLeads.filter((lead) => namedSheets.includes(lead._sheet)) : allLeads,
      leadSheets,
      clients: await mock.mockGetObjects(SHEETS.CLIENTS),
      sessions: await mock.mockGetObjects(SHEETS.SESSIONS),
      messages: await mock.mockGetObjects(SHEETS.INTERACTIONS),
      worklogs: await mock.mockGetObjects(SHEETS.LOGS),
      users,
    };
  }

  const users = await loadUsersSnapshot();
  const salesSpreadsheetId = salesId();
  const salesBook = await withNotFound('Sales', salesSpreadsheetId, () =>
    getSpreadsheet({ spreadsheetId: salesSpreadsheetId })
  );
  const titles = sheetTitles(salesBook);
  const titleSet = new Set(titles);
  const namedSheets = namedLeadSheets(users, titleSet);
  const leadCandidates = namedSheets.length
    ? namedSheets
    : titles.filter((title) => !SYSTEM_TITLES.has(title) || title === SHEETS.NO_RESPONSE);
  const salesExtras = [SHEETS.INTERACTIONS].filter((title) => titleSet.has(title));
  const useSettings = titleSet.has(SHEETS.SETTINGS);
  const salesRanges = [
    useSettings ? a1(SHEETS.SETTINGS, 'A:A') : null,
    ...leadCandidates.map((title) => a1(title, 'A:Q')),
    ...salesExtras.map((title) => a1(title, 'A:Z')),
  ].filter(Boolean);
  const salesRows = salesRanges.length
    ? await withNotFound('Sales', salesSpreadsheetId, () => batchGetValues(salesRanges, salesSpreadsheetId))
    : [];
  let offset = 0;
  const settingsRows = useSettings ? salesRows[offset++] || [] : [];
  const leadValueGroups = leadCandidates.map(() => salesRows[offset++] || []);
  const extraValues = Object.fromEntries(salesExtras.map((title) => [title, salesRows[offset++] || []]));
  const headerByTitle = new Map(leadCandidates.map((title, index) => [title, leadValueGroups[index]?.[0] || []]));
  const leadSheets = namedSheets.length
    ? namedSheets
    : classifyLeadSheets(titleSet, settingsRows, headerByTitle);
  const leads = leadSheets.flatMap((name) => {
    const index = leadCandidates.indexOf(name);
    const values = index >= 0 ? leadValueGroups[index] || [] : [];
    return rowsToObjects(values, LEAD_HEADERS).map((lead) => ({
      ...lead,
      Status: normalizeStatus(lead.Status),
      _sheet: name,
    }));
  });

  const training = await loadTrainingSnapshot();

  return {
    leads,
    leadSheets,
    clients: training.clients,
    sessions: training.sessions,
    messages: rowsToObjects(extraValues[SHEETS.INTERACTIONS] || [], INTERACTION_HEADERS),
    worklogs: training.worklogs,
    users,
  };
};

const emptyTrainingSnapshot = () => ({ clients: [], sessions: [], worklogs: [] });

const loadTrainingSnapshot = async () => {
  const trainingSpreadsheetId = getTrainingSpreadsheetId();
  if (!trainingSpreadsheetId) return emptyTrainingSnapshot();
  try {
    const trainingBook = await getSpreadsheet({ spreadsheetId: trainingSpreadsheetId });
    const trainingTitles = new Set(sheetTitles(trainingBook));
    const trainingExtras = [SHEETS.CLIENTS, SHEETS.SESSIONS, SHEETS.LOGS].filter((title) =>
      trainingTitles.has(title)
    );
    const trainingRows = trainingExtras.length
      ? await batchGetValues(
          trainingExtras.map((title) => a1(title, 'A:Z')),
          trainingSpreadsheetId
        )
      : [];
    const extraValues = Object.fromEntries(
      trainingExtras.map((title, index) => [title, trainingRows[index] || []])
    );
    return {
      clients: rowsToObjects(extraValues[SHEETS.CLIENTS] || [], HEADERS[SHEETS.CLIENTS] || []),
      sessions: rowsToObjects(extraValues[SHEETS.SESSIONS] || [], HEADERS[SHEETS.SESSIONS] || []),
      worklogs: rowsToObjects(extraValues[SHEETS.LOGS] || [], HEADERS[SHEETS.LOGS] || []),
    };
  } catch (error) {
    if (isNotFoundError(error) || isPermissionError(error)) return emptyTrainingSnapshot();
    throw error;
  }
};

const loadUsersSnapshot = async () => {
  const usersSpreadsheetId = getConfig().employeesSpreadsheetId;
  if (!usersSpreadsheetId) return [];
  try {
    const userRows = await getValues(a1(SHEETS.USERS, 'A:Z'), usersSpreadsheetId);
    return rowsToObjects(userRows, resolveUserHeaders(userRows)).map(toDirectoryUser);
  } catch (error) {
    if (isNotFoundError(error) || isPermissionError(error)) return [];
    throw error;
  }
};

export const getLeads = async () => {
  if (isDemoMode()) return mock.mockGetLeads();
  const snapshot = await loadCrmSnapshot();
  return snapshot.leads;
};

export const addLead = async (lead) => {
  if (isDemoMode()) return mock.mockAddLead(lead);
  const sheetName = lead._sheet || String(lead.Executive || 'SALES').trim().toUpperCase();
  const titles = new Set(sheetTitles(await getSpreadsheet({ spreadsheetId: salesId() })));
  if (!titles.has(sheetName)) {
    await ensureSheetWithHeaders(titles, sheetName, LEAD_HEADERS, undefined, salesId());
  }
  const existing = await leadObjectsFromSheet(sheetName);
  const nextNo =
    existing.reduce((max, row) => Math.max(max, Number(row['Sl No']) || 0), 0) + 1;
  const payload = { ...lead, 'Sl No': lead['Sl No'] || String(nextNo), _sheet: sheetName };
  await appendValues(a1(sheetName, 'A:Q'), [objectToRow(payload, LEAD_HEADERS)], salesId());
  return payload;
};

export const updateLead = async (lead, patch) => {
  if (isDemoMode()) return mock.mockUpdateLead(lead, patch);
  const sheetName = patch._sheet || lead._sheet;
  if (!sheetName || !lead._row) throw new Error('Lead sheet location is missing.');
  const next = { ...lead, ...patch, Status: normalizeStatus(patch.Status || lead.Status) };
  await updateValues(a1(sheetName, `A${lead._row}:Q${lead._row}`), [objectToRow(next, LEAD_HEADERS)], salesId());
  return next;
};

const getObjectsSafe = async (sheetName) => {
  if (isDemoMode()) return mock.mockGetObjects(sheetName);
  try {
    const values = await getValues(a1(sheetName, 'A:Z'), idForSheet(sheetName));
    return rowsToObjects(values, HEADERS[sheetName] || []);
  } catch {
    return [];
  }
};

const appendObject = async (sheetName, obj, headers = HEADERS[sheetName]) => {
  if (isDemoMode()) return mock.mockAppend(sheetName, obj);
  await appendValues(a1(sheetName, 'A:Z'), [objectToRow(obj, headers)], idForSheet(sheetName));
  return obj;
};

const updateObjectById = async (sheetName, idHeader, id, patch) => {
  if (isDemoMode()) return mock.mockUpdateById(sheetName, idHeader, id, patch);
  const headers = HEADERS[sheetName];
  const spreadsheetId = idForSheet(sheetName);
  const values = await getValues(a1(sheetName, 'A:Z'), spreadsheetId);
  const objects = rowsToObjects(values, headers);
  const index = objects.findIndex((row) => row[idHeader] === id);
  if (index < 0) throw new Error(`${idHeader} ${id} not found in ${sheetName}`);
  const next = { ...objects[index], ...patch };
  const rowNumber = objects[index]._row;
  const lastCol = String.fromCharCode(64 + headers.length);
  await updateValues(a1(sheetName, `A${rowNumber}:${lastCol}${rowNumber}`), [objectToRow(next, headers)], spreadsheetId);
  return next;
};

const sameEmail = (left, right) => String(left || '').trim().toLowerCase() === String(right || '').trim().toLowerCase();

const toDirectoryUser = (row = {}) => ({
  ...row,
  Username: String(row.Username || '').trim(),
  Email: String(row.Email || '').trim().toLowerCase(),
  'User Type': String(row['User Type'] || '').trim(),
  'User Role': String(row['User Role'] || '').trim(),
  'Calendar ID': String(row['Calendar ID'] || '').trim(),
  'Last Login': String(row['Last Login'] || '').trim(),
  Registered: String(row.Registered || '').trim() || 'Yes',
  'Sheet Name': sheetNameFromUser(row),
});

const readUsersTable = async (spreadsheetId) => {
  const values = await getValues(a1(SHEETS.USERS, 'A:Z'), spreadsheetId);
  const headers = resolveUserHeaders(values);
  return { headers, users: rowsToObjects(values, headers).map(toDirectoryUser) };
};

const listUsersFrom = async (spreadsheetId) => {
  const table = await readUsersTable(spreadsheetId);
  return table.users;
};

const writeUserToSpreadsheet = async (spreadsheetId, payload) => {
  await ensureRequiredSheets(spreadsheetId, [[SHEETS.USERS, HEADERS[SHEETS.USERS]]]);
  const { headers, users } = await readUsersTable(spreadsheetId);
  const existing = users.find((row) => sameEmail(row.Email, payload.Email));
  const lastCol = columnLetter(headers.length);
  if (existing?._row) {
    const next = {
      ...existing,
      ...payload,
      Username: payload.Username || existing.Username,
      Email: payload.Email,
      'User Type': existing['User Type'] || payload['User Type'] || 'Sales',
      'User Role': existing['User Role'] || payload['User Role'] || 'Team member',
      'Calendar ID': existing['Calendar ID'] || payload['Calendar ID'] || 'primary',
      'Last Login': payload['Last Login'] || existing['Last Login'],
      Registered: 'Yes',
      'Sheet Name':
        payload['Sheet Name'] !== undefined && payload['Sheet Name'] !== null
          ? String(payload['Sheet Name']).trim()
          : sheetNameFromUser(existing),
    };
    await updateValues(
      a1(SHEETS.USERS, `A${existing._row}:${lastCol}${existing._row}`),
      [objectToRow(next, headers)],
      spreadsheetId
    );
    return toDirectoryUser({ ...next, _row: existing._row });
  }
  await appendValues(a1(SHEETS.USERS, 'A:Z'), [objectToRow(payload, headers)], spreadsheetId);
  return toDirectoryUser(payload);
};

const ensureUserDetailsSheet = async () => {
  const spreadsheetId = employeesId();
  await withNotFound('User details', spreadsheetId, () =>
    ensureRequiredSheets(spreadsheetId, [[SHEETS.USERS, HEADERS[SHEETS.USERS]]])
  );
  return spreadsheetId;
};

export const getUsers = async () => {
  if (isDemoMode()) return (await mock.mockGetObjects(SHEETS.USERS)).map(toDirectoryUser);
  const spreadsheetId = await ensureUserDetailsSheet();
  return listUsersFrom(spreadsheetId);
};

export const upsertDirectoryUser = async ({ name, email }) => {
  const username = String(name || '').trim() || String(email || '').split('@')[0];
  const address = String(email || '').trim().toLowerCase();
  if (!address) throw new Error('A Google email is required to record this user.');

  const loggedInAt = nowIso();
  if (isDemoMode()) {
    const users = await getUsers();
    const existing = users.find((row) => sameEmail(row.Email, address));
    const payload = {
      Username: username,
      Email: address,
      'User Type': existing?.['User Type'] || 'Sales',
      'User Role': existing?.['User Role'] || (users.length === 0 ? 'Admin' : 'Team member'),
      'Calendar ID': existing?.['Calendar ID'] || 'primary',
      'Last Login': loggedInAt,
      Registered: 'Yes',
      'Sheet Name': sheetNameFromUser(existing),
    };
    if (existing) return toDirectoryUser(await updateDirectoryUser(address, payload));
    await appendObject(SHEETS.USERS, payload);
    return toDirectoryUser(payload);
  }

  let spreadsheetId = '';
  try {
    spreadsheetId = await ensureUserDetailsSheet();
  } catch (error) {
    if (isNotFoundError(error)) throw missingSpreadsheetError('User details', getConfig().employeesSpreadsheetId);
    throw new Error(
      error.message ||
        'User details spreadsheet ID is missing in Workbook_Config. Add a Users row with that spreadsheet ID.'
    );
  }

  let users = [];
  try {
    users = await listUsersFrom(spreadsheetId);
  } catch (error) {
    if (isNotFoundError(error)) throw missingSpreadsheetError('User details', spreadsheetId);
    if (!isPermissionError(error)) throw error;
  }
  const existing = users.find((row) => sameEmail(row.Email, address));
  const payload = {
    Username: username,
    Email: address,
    'User Type': existing?.['User Type'] || 'Sales',
    'User Role': existing?.['User Role'] || (users.length === 0 ? 'Admin' : 'Team member'),
    'Calendar ID': existing?.['Calendar ID'] || 'primary',
    'Last Login': loggedInAt,
    Registered: 'Yes',
    'Sheet Name': sheetNameFromUser(existing),
  };

  try {
    const saved = await writeUserToSpreadsheet(spreadsheetId, payload);
    return toDirectoryUser(saved);
  } catch (error) {
    throw new Error(
      describeSheetWriteError(error, spreadsheetId, 'user details', address) ||
        `Google sign-in could not register ${address} on the Users sheet.`
    );
  }
};

export const updateDirectoryUser = async (email, patch) => {
  const address = String(email || '').trim().toLowerCase();
  const users = await getUsers();
  const existing = users.find((row) => sameEmail(row.Email, address));
  if (!existing) throw new Error(`User ${address} was not found in the Users sheet.`);
  const next = toDirectoryUser({ ...existing, ...patch, Email: address });
  if (isDemoMode()) {
    return mock.mockUpdateById(SHEETS.USERS, 'Email', existing.Email, next);
  }
  const { headers } = await readUsersTable(employeesId());
  const lastCol = columnLetter(headers.length);
  await updateValues(
    a1(SHEETS.USERS, `A${existing._row}:${lastCol}${existing._row}`),
    [objectToRow(next, headers)],
    employeesId()
  );
  return next;
};

export const getClients = () => getObjectsSafe(SHEETS.CLIENTS);
export const getSessions = () => getObjectsSafe(SHEETS.SESSIONS);
export const getMessages = () => getObjectsSafe(SHEETS.INTERACTIONS);
export const getWorklogs = () => getObjectsSafe(SHEETS.LOGS);

const ensureTrainingSheets = async () => {
  if (isDemoMode()) return;
  await ensureRequiredSheets(trainingId(), [
    [SHEETS.CLIENTS, HEADERS[SHEETS.CLIENTS]],
    [SHEETS.SESSIONS, HEADERS[SHEETS.SESSIONS]],
    [SHEETS.LOGS, HEADERS[SHEETS.LOGS]],
  ]);
  await ensureRequiredSheets(employeesId(), [[SHEETS.USERS, HEADERS[SHEETS.USERS]]]);
};

export const addClient = async (client) => {
  await ensureTrainingSheets();
  return appendObject(SHEETS.CLIENTS, client);
};
export const updateClient = (clientId, patch) =>
  updateObjectById(SHEETS.CLIENTS, 'Client_ID', clientId, patch);

export const addSession = async (session) => {
  await ensureTrainingSheets();
  return appendObject(SHEETS.SESSIONS, session);
};
export const updateSession = (sessionId, patch) =>
  updateObjectById(SHEETS.SESSIONS, 'Session_ID', sessionId, patch);

export const addMessage = (message) => appendObject(SHEETS.INTERACTIONS, message, INTERACTION_HEADERS);
export const addWorklog = (log) => appendObject(SHEETS.LOGS, log);
export const updateWorklog = (logId, patch) => updateObjectById(SHEETS.LOGS, 'Log_ID', logId, patch);

export const addAudit = async (entry) => appendObject(SHEETS.AUDIT, entry, HEADERS[SHEETS.AUDIT]);

export const appendLeadComment = async (lead, note) => {
  const comments = appendStageComment(lead.Comments, note);
  return updateLead(lead, { Comments: comments });
};

export const getSessionsForTrainerOnDate = async (trainerEmail, date) => {
  if (isDemoMode()) return mock.mockSessionsForTrainerOnDate(trainerEmail, date);
  const sessions = await getSessions();
  return sessions.filter(
    (session) =>
      session.Trainer_Email === trainerEmail &&
      sameDay(session.Start_Time, date) &&
      session.Status !== 'Cancelled' &&
      session.Status !== 'Completed'
  );
};

import {
  HEADERS,
  INTERACTION_HEADERS,
  LEAD_HEADERS,
  SHEETS,
  SYSTEM_SHEETS,
  appendStageComment,
  isLeadHeaderRow,
  normalizeStatus,
  objectToRow,
  rowsToObjects,
  sameDay,
} from '../utils/constants';
import {
  getSpreadsheetId,
  googleFetch,
  isDemoMode,
  isGapiReady,
} from './googleApi';
import * as mock from './mockBackend';

const SYSTEM_TITLES = new Set([
  ...Object.values(SYSTEM_SHEETS),
  SHEETS.NO_RESPONSE,
  SHEETS.CLIENTS,
  SHEETS.SESSIONS,
  SHEETS.LOGS,
]);

const a1 = (sheet, range) => {
  const quoted = /[^A-Za-z0-9_]/.test(sheet) ? `'${sheet.replace(/'/g, "''")}'` : sheet;
  return `${quoted}!${range}`;
};

const sheetUrl = (path = '') => {
  const id = getSpreadsheetId();
  if (!id) throw new Error('Spreadsheet ID is missing.');
  return `https://sheets.googleapis.com/v4/spreadsheets/${id}${path}`;
};

const getValues = async (range) => {
  if (isGapiReady()) {
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(),
      range,
    });
    return response.result.values || [];
  }
  const data = await googleFetch(`${sheetUrl()}/values/${encodeURIComponent(range)}`);
  return data.values || [];
};

const appendValues = async (range, values) => {
  if (isGapiReady()) {
    await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: getSpreadsheetId(),
      range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values },
    });
    return;
  }
  await googleFetch(
    `${sheetUrl()}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: 'POST', body: JSON.stringify({ values }) }
  );
};

const updateValues = async (range, values) => {
  if (isGapiReady()) {
    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: getSpreadsheetId(),
      range,
      valueInputOption: 'USER_ENTERED',
      resource: { values },
    });
    return;
  }
  await googleFetch(
    `${sheetUrl()}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    { method: 'PUT', body: JSON.stringify({ values }) }
  );
};

const getSpreadsheet = async () => {
  if (isGapiReady()) {
    const response = await window.gapi.client.sheets.spreadsheets.get({
      spreadsheetId: getSpreadsheetId(),
    });
    return response.result;
  }
  return googleFetch(sheetUrl());
};

const batchUpdate = async (requests) => {
  if (isGapiReady()) {
    await window.gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: getSpreadsheetId(),
      resource: { requests },
    });
    return;
  }
  await googleFetch(`${sheetUrl()}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests }),
  });
};

const ensureSheetWithHeaders = async (existing, title, headers) => {
  if (!existing.has(title)) {
    await batchUpdate([{ addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } } }]);
    existing.add(title);
    await updateValues(a1(title, 'A1'), [headers]);
    return;
  }
  const first = (await getValues(a1(title, '1:1')))[0] || [];
  const hasHeaders = headers.every((header, index) => String(first[index] || '').trim() === header);
  if (!hasHeaders && first.every((cell) => String(cell || '').trim() === '')) {
    await updateValues(a1(title, 'A1'), [headers]);
  }
};

export const ensureWorkbook = async () => {
  if (isDemoMode()) return mock.mockEnsureWorkbook();

  const spreadsheet = await getSpreadsheet();
  const existing = new Set((spreadsheet.sheets || []).map((sheet) => sheet.properties.title));

  await ensureSheetWithHeaders(existing, SHEETS.SETTINGS, HEADERS[SHEETS.SETTINGS]);
  await ensureSheetWithHeaders(existing, SHEETS.INTERACTIONS, INTERACTION_HEADERS);
  await ensureSheetWithHeaders(existing, SHEETS.AUDIT, HEADERS[SHEETS.AUDIT]);
  await ensureSheetWithHeaders(existing, SHEETS.CLIENTS, HEADERS[SHEETS.CLIENTS]);
  await ensureSheetWithHeaders(existing, SHEETS.SESSIONS, HEADERS[SHEETS.SESSIONS]);

  const leadSheets = await listLeadSheetNames(existing);
  if (!leadSheets.length) {
    await ensureSheetWithHeaders(existing, 'SALES', LEAD_HEADERS);
    const settingsRows = await getValues(a1(SHEETS.SETTINGS, 'A:A'));
    if (settingsRows.length <= 1) {
      await updateValues(a1(SHEETS.SETTINGS, 'A1'), [['Active CRM Sheets'], ['SALES']]);
    }
  }

  return true;
};

const listLeadSheetNames = async (existingTitles) => {
  const titles = existingTitles || new Set(((await getSpreadsheet()).sheets || []).map((sheet) => sheet.properties.title));
  const settingsRows = await getValues(a1(SHEETS.SETTINGS, 'A:A')).catch(() => []);
  const configured = settingsRows
    .slice(1)
    .map((row) => String(row[0] || '').trim())
    .filter(Boolean);

  const names = new Set();
  configured.forEach((name) => {
    if (titles.has(name) && !SYSTEM_TITLES.has(name)) names.add(name);
  });

  for (const title of titles) {
    if (SYSTEM_TITLES.has(title)) continue;
    if (names.has(title)) continue;
    const first = (await getValues(a1(title, '1:1')))[0] || [];
    if (isLeadHeaderRow(first) || title === SHEETS.NO_RESPONSE) names.add(title);
  }

  return [...names];
};

const leadObjectsFromSheet = async (sheetName) => {
  const values = await getValues(a1(sheetName, 'A:Q'));
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

export const getLeads = async () => {
  if (isDemoMode()) return mock.mockGetLeads();
  const sheets = await listLeadSheetNames();
  const groups = await Promise.all(sheets.map((name) => leadObjectsFromSheet(name)));
  return groups.flat();
};

export const addLead = async (lead) => {
  if (isDemoMode()) return mock.mockAddLead(lead);
  const sheetName = lead._sheet || String(lead.Executive || 'SALES').trim().toUpperCase();
  const titles = new Set(((await getSpreadsheet()).sheets || []).map((sheet) => sheet.properties.title));
  if (!titles.has(sheetName)) {
    await ensureSheetWithHeaders(titles, sheetName, LEAD_HEADERS);
  }
  const existing = await leadObjectsFromSheet(sheetName);
  const nextNo =
    existing.reduce((max, row) => Math.max(max, Number(row['Sl No']) || 0), 0) + 1;
  const payload = { ...lead, 'Sl No': lead['Sl No'] || String(nextNo), _sheet: sheetName };
  await appendValues(a1(sheetName, 'A:Q'), [objectToRow(payload, LEAD_HEADERS)]);
  return payload;
};

export const updateLead = async (lead, patch) => {
  if (isDemoMode()) return mock.mockUpdateLead(lead, patch);
  const sheetName = patch._sheet || lead._sheet;
  if (!sheetName || !lead._row) throw new Error('Lead sheet location is missing.');
  const next = { ...lead, ...patch, Status: normalizeStatus(patch.Status || lead.Status) };
  await updateValues(a1(sheetName, `A${lead._row}:Q${lead._row}`), [objectToRow(next, LEAD_HEADERS)]);
  return next;
};

const getObjectsSafe = async (sheetName) => {
  if (isDemoMode()) return mock.mockGetObjects(sheetName);
  try {
    const values = await getValues(a1(sheetName, 'A:Z'));
    return rowsToObjects(values, HEADERS[sheetName] || []);
  } catch {
    return [];
  }
};

const appendObject = async (sheetName, obj, headers = HEADERS[sheetName]) => {
  if (isDemoMode()) return mock.mockAppend(sheetName, obj);
  await appendValues(a1(sheetName, 'A:Z'), [objectToRow(obj, headers)]);
  return obj;
};

const updateObjectById = async (sheetName, idHeader, id, patch) => {
  if (isDemoMode()) return mock.mockUpdateById(sheetName, idHeader, id, patch);
  const headers = HEADERS[sheetName];
  const values = await getValues(a1(sheetName, 'A:Z'));
  const objects = rowsToObjects(values, headers);
  const index = objects.findIndex((row) => row[idHeader] === id);
  if (index < 0) throw new Error(`${idHeader} ${id} not found in ${sheetName}`);
  const next = { ...objects[index], ...patch };
  const rowNumber = objects[index]._row;
  const lastCol = String.fromCharCode(64 + headers.length);
  await updateValues(a1(sheetName, `A${rowNumber}:${lastCol}${rowNumber}`), [objectToRow(next, headers)]);
  return next;
};

export const getClients = () => getObjectsSafe(SHEETS.CLIENTS);
export const getSessions = () => getObjectsSafe(SHEETS.SESSIONS);
export const getMessages = () => getObjectsSafe(SHEETS.INTERACTIONS);
export const getWorklogs = () => getObjectsSafe(SHEETS.LOGS);

const ensureTrainingSheets = async () => {
  if (isDemoMode()) return;
  const spreadsheet = await getSpreadsheet();
  const existing = new Set((spreadsheet.sheets || []).map((sheet) => sheet.properties.title));
  await ensureSheetWithHeaders(existing, SHEETS.CLIENTS, HEADERS[SHEETS.CLIENTS]);
  await ensureSheetWithHeaders(existing, SHEETS.SESSIONS, HEADERS[SHEETS.SESSIONS]);
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

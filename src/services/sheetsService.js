import {
  HEADERS,
  INTERACTION_HEADERS,
  LEAD_HEADERS,
  SHEETS,
  SYSTEM_SHEETS,
  TRAINING_WORKBOOK_SHEETS,
  appendStageComment,
  isLeadHeaderRow,
  normalizeStatus,
  objectToRow,
  rowsToObjects,
  sameDay,
} from '../utils/constants';
import {
  getSpreadsheetId,
  getTrainingSpreadsheetId,
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
const idForSheet = (sheetName) => (TRAINING_TITLES.has(sheetName) ? trainingId() : salesId());

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
  if (isGapiReady()) {
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
  if (isGapiReady()) {
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
  if (isGapiReady()) {
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
  if (isGapiReady()) {
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
  const data = isGapiReady()
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
  if (isGapiReady()) {
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
    [SHEETS.USERS, HEADERS[SHEETS.USERS]],
    [SHEETS.LOGS, HEADERS[SHEETS.LOGS]],
  ]);

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
    return {
      leads: await mock.mockGetLeads(),
      leadSheets: await mock.mockGetLeadSheets(),
      clients: await mock.mockGetObjects(SHEETS.CLIENTS),
      sessions: await mock.mockGetObjects(SHEETS.SESSIONS),
      messages: await mock.mockGetObjects(SHEETS.INTERACTIONS),
      worklogs: await mock.mockGetObjects(SHEETS.LOGS),
      users: await mock.mockGetObjects(SHEETS.USERS),
    };
  }

  const [salesBook, trainingBook] = await Promise.all([
    getSpreadsheet({ spreadsheetId: salesId() }),
    getSpreadsheet({ spreadsheetId: trainingId() }),
  ]);
  const titles = sheetTitles(salesBook);
  const titleSet = new Set(titles);
  const trainingTitles = new Set(sheetTitles(trainingBook));
  const leadCandidates = titles.filter((title) => !SYSTEM_TITLES.has(title) || title === SHEETS.NO_RESPONSE);
  const salesExtras = [SHEETS.INTERACTIONS].filter((title) => titleSet.has(title));
  const trainingExtras = [SHEETS.CLIENTS, SHEETS.SESSIONS, SHEETS.USERS, SHEETS.LOGS].filter((title) =>
    trainingTitles.has(title)
  );
  const salesRanges = [
    titleSet.has(SHEETS.SETTINGS) ? a1(SHEETS.SETTINGS, 'A:A') : null,
    ...leadCandidates.map((title) => a1(title, 'A:Q')),
    ...salesExtras.map((title) => a1(title, 'A:Z')),
  ].filter(Boolean);
  const trainingRanges = trainingExtras.map((title) => a1(title, 'A:Z'));

  const [salesRows, trainingRows] = await Promise.all([
    salesRanges.length ? batchGetValues(salesRanges, salesId()) : Promise.resolve([]),
    trainingRanges.length ? batchGetValues(trainingRanges, trainingId()) : Promise.resolve([]),
  ]);
  let offset = 0;
  const settingsRows = titleSet.has(SHEETS.SETTINGS) ? salesRows[offset++] || [] : [];
  const leadValueGroups = leadCandidates.map(() => salesRows[offset++] || []);
  const extraValues = {
    ...Object.fromEntries(salesExtras.map((title) => [title, salesRows[offset++] || []])),
    ...Object.fromEntries(trainingExtras.map((title, index) => [title, trainingRows[index] || []])),
  };

  const headerByTitle = new Map(leadCandidates.map((title, index) => [title, leadValueGroups[index]?.[0] || []]));
  const leadSheets = classifyLeadSheets(titleSet, settingsRows, headerByTitle);
  const leads = leadSheets.flatMap((name) => {
    const index = leadCandidates.indexOf(name);
    const values = index >= 0 ? leadValueGroups[index] || [] : [];
    return rowsToObjects(values, LEAD_HEADERS).map((lead) => ({
      ...lead,
      Status: normalizeStatus(lead.Status),
      _sheet: name,
    }));
  });

  const objects = (title) => rowsToObjects(extraValues[title] || [], HEADERS[title] || []);

  return {
    leads,
    leadSheets,
    clients: objects(SHEETS.CLIENTS),
    sessions: objects(SHEETS.SESSIONS),
    messages: rowsToObjects(extraValues[SHEETS.INTERACTIONS] || [], INTERACTION_HEADERS),
    worklogs: objects(SHEETS.LOGS),
    users: objects(SHEETS.USERS),
  };
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
});

export const getUsers = async () => (await getObjectsSafe(SHEETS.USERS)).map(toDirectoryUser);

export const upsertDirectoryUser = async ({ name, email }) => {
  const username = String(name || '').trim() || String(email || '').split('@')[0];
  const address = String(email || '').trim().toLowerCase();
  if (!address) throw new Error('A Google email is required to record this user.');

  const users = await getUsers();
  const existing = users.find((row) => sameEmail(row.Email, address));
  if (existing) {
    const next = {
      ...existing,
      Username: username || existing.Username,
      Email: address,
      'User Type': existing['User Type'] || 'Sales',
      'User Role': existing['User Role'] || (users.length === 1 ? 'Admin' : 'Team member'),
    };
    if (
      next.Username !== existing.Username ||
      next['User Type'] !== existing['User Type'] ||
      next['User Role'] !== existing['User Role']
    ) {
      return toDirectoryUser(await updateDirectoryUser(address, next));
    }
    return toDirectoryUser(next);
  }

  const payload = {
    Username: username,
    Email: address,
    'User Type': users.length === 0 ? 'Sales' : 'Sales',
    'User Role': users.length === 0 ? 'Admin' : 'Team member',
  };
  await appendObject(SHEETS.USERS, payload);
  return toDirectoryUser(payload);
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
  const lastCol = String.fromCharCode(64 + HEADERS[SHEETS.USERS].length);
  await updateValues(
    a1(SHEETS.USERS, `A${existing._row}:${lastCol}${existing._row}`),
    [objectToRow(next, HEADERS[SHEETS.USERS])],
    trainingId()
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
    [SHEETS.USERS, HEADERS[SHEETS.USERS]],
    [SHEETS.LOGS, HEADERS[SHEETS.LOGS]],
  ]);
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

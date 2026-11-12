import {
  HEADERS,
  INTERACTION_HEADERS,
  LEAD_HEADERS,
  SHEETS,
  STORAGE_KEYS,
  appendStageComment,
  createId,
  formatDdMmYyyy,
  formatDdMmYyyyHm,
  objectToRow,
  rowsToObjects,
  sameDay,
} from '../utils/constants';

const emptyDb = () => ({
  [SHEETS.SETTINGS]: [HEADERS[SHEETS.SETTINGS], ['ANWAR'], ['SUNISH']],
  ANWAR: [LEAD_HEADERS],
  SUNISH: [LEAD_HEADERS],
  [SHEETS.INTERACTIONS]: [INTERACTION_HEADERS],
  [SHEETS.AUDIT]: [HEADERS[SHEETS.AUDIT]],
  [SHEETS.CLIENTS]: [HEADERS[SHEETS.CLIENTS]],
  [SHEETS.SESSIONS]: [HEADERS[SHEETS.SESSIONS]],
  [SHEETS.LOGS]: [HEADERS[SHEETS.LOGS]],
});

const leadRow = (sheet, values) => {
  const obj = {
    'Sl No': '',
    Executive: '',
    Date: formatDdMmYyyy(new Date()),
    'Customer Name': '',
    'Email ID': '',
    'Contact Number': '',
    Source: 'Online leads',
    'Source(Remarks)': '',
    Country: '',
    State: '',
    Language: '',
    City: '',
    Specialization: '',
    Region: 'Domestic',
    Status: 'New',
    Comments: '',
    'Scheduled Date': '',
    ...values,
  };
  return objectToRow(obj, LEAD_HEADERS);
};

const seedDb = () => {
  const today = formatDdMmYyyy(new Date());
  const soon = new Date(Date.now() + 4 * 60 * 1000);
  const later = new Date();
  later.setHours(17, 0, 0, 0);
  if (later.getTime() <= Date.now()) later.setDate(later.getDate() + 1);
  const overdue = new Date();
  overdue.setDate(overdue.getDate() - 1);
  overdue.setHours(10, 30, 0, 0);
  const clientId = createId('CL');
  const pendingClientId = createId('CL');
  const start = new Date();
  start.setHours(11, 0, 0, 0);
  const end = new Date(start);
  end.setHours(12, 0, 0, 0);

  return {
    [SHEETS.SETTINGS]: [HEADERS[SHEETS.SETTINGS], ['ANWAR'], ['SUNISH']],
    ANWAR: [
      LEAD_HEADERS,
      leadRow('ANWAR', {
        'Sl No': '8',
        Executive: 'Anwar',
        Date: '09/01/2021',
        'Customer Name': 'Dr Karthi',
        'Email ID': 'drkaarent@gmail.com',
        'Contact Number': '8129073473',
        Source: 'Online leads',
        State: 'Tamil Nadu',
        Specialization: 'ENT',
        Region: 'Domestic',
        Status: 'Demo Done-Closed',
        Comments:
          'Stage 1 (01/09/2021) Demo done.\nStage 5 (08/09/2021) Sale closed. paid the amount 30000/-.\nStage 6 Passed to training team\n',
      }),
      leadRow('ANWAR', {
        'Sl No': '9',
        Executive: 'Anwar',
        Date: '11/01/2021',
        'Customer Name': 'Boney J Thomas',
        'Contact Number': '9645780299',
        Source: 'Online leads',
        State: 'Kerala',
        Region: 'Domestic',
        Status: 'Not Interested',
        Comments: 'Stage 3 (05/11/2021) He told he dont want the S/W',
      }),
      leadRow('ANWAR', {
        'Sl No': '1125',
        Executive: 'Anwar',
        Date: today,
        'Customer Name': 'Dr. Prakash Nayak',
        'Email ID': 'prakash@clinic.test',
        'Contact Number': '02266099551',
        Source: 'Google Ads',
        State: 'Maharashtra',
        City: 'Mumbai',
        Specialization: 'Dentistry',
        Region: 'Domestic',
        Status: 'No Response',
        'Scheduled Date': formatDdMmYyyyHm(soon),
        Comments: 'Stage 1 (16/07/2019) Called Dr Prakash and not reachable at the moment\nStage 2 Callback scheduled\n',
      }),
    ],
    SUNISH: [
      LEAD_HEADERS,
      leadRow('SUNISH', {
        'Sl No': '1',
        Executive: 'Sunish',
        Date: '23/04/2024',
        'Customer Name': 'Dr Hakeel Adam',
        'Contact Number': '9995567897',
        Source: 'Meta Ads',
        'Source(Remarks)': 'Facebook/Instagram',
        State: 'Kerala',
        City: 'Kochi',
        Specialization: 'Dentistry',
        Region: 'Domestic',
        Status: 'Demo Done-Not Interested',
        Comments: 'Stage 3 (06/05/2026) Demo done\nStage 4 (04/08/2026) He will make an own customized software',
      }),
      leadRow('SUNISH', {
        'Sl No': '2',
        Executive: 'Sunish',
        Date: today,
        'Customer Name': 'Herbal Hub (Dr Ann Maria)',
        'Contact Number': '8089654642',
        Source: 'Meta Form',
        'Source(Remarks)': 'Facebook/Instagram',
        State: 'Kerala',
        City: 'Kollam',
        Specialization: 'Dermatology',
        Region: 'Domestic',
        Status: 'Demo Scheduled',
        'Scheduled Date': formatDdMmYyyyHm(later),
        Comments: 'Stage 1 Demo scheduled today at 5pm',
      }),
      leadRow('SUNISH', {
        'Sl No': '3',
        Executive: 'Sunish',
        Date: '15/10/2025',
        'Customer Name': 'Jay Mevada',
        'Email ID': 'dratulmevada68@gmail.com',
        'Contact Number': '919825249365',
        Source: 'Tech Jocky',
        Region: 'Domestic',
        Status: 'Follow up for Demo',
        'Scheduled Date': formatDdMmYyyyHm(overdue),
        Comments: 'Stage 1 Waiting to confirm demo slot\nStage 2 Call scheduled\n',
      }),
      leadRow('SUNISH', {
        'Sl No': '4',
        Executive: 'Sunish',
        Date: today,
        'Customer Name': 'Dr Yogesh Kumar',
        'Email ID': 'dryogesh@clinic.test',
        'Contact Number': '9876543210',
        Source: 'Website',
        State: 'Karnataka',
        City: 'Bengaluru',
        Specialization: 'Dentistry',
        Region: 'Domestic',
        Status: 'Demo Done-Closed',
        Comments:
          'Stage 1 Demo done.\nStage 2 Sale closed.\nStage 3 Passed to training team\n',
      }),
      leadRow('SUNISH', {
        'Sl No': '5',
        Executive: 'Sunish',
        Date: today,
        'Customer Name': 'Dr Meera Nair',
        'Email ID': 'drmeera@clinic.test',
        'Contact Number': '9988776655',
        Source: 'Google Ads',
        State: 'Kerala',
        City: 'Kochi',
        Specialization: 'Gynecology',
        Region: 'Domestic',
        Status: 'Demo Done-Closed',
        Comments: 'Stage 1 Demo done.\nStage 2 Sale closed.\n',
      }),
    ],
    [SHEETS.INTERACTIONS]: [
      INTERACTION_HEADERS,
      ['12/09/2026 15:43:38', 'SUNISH', 'Herbal Hub (Dr Ann Maria)', 'Sunish', 'Comment', 'Dermatology clinic', ''],
    ],
    [SHEETS.AUDIT]: [HEADERS[SHEETS.AUDIT]],
    [SHEETS.CLIENTS]: [
      HEADERS[SHEETS.CLIENTS],
      objectToRow(
        {
          Client_ID: pendingClientId,
          Lead_ID: 'SUNISH#4',
          Client_Name: 'Dr Yogesh Kumar',
          Contact_Email: 'dryogesh@clinic.test',
          Assigned_Trainer: '',
          Training_Status: 'Not started',
          Completed_Date: '',
          Work_Type: 'Doubt clarification',
        },
        HEADERS[SHEETS.CLIENTS]
      ),
      objectToRow(
        {
          Client_ID: clientId,
          Lead_ID: 'ANWAR#8',
          Client_Name: 'Dr Karthi',
          Contact_Email: 'drkaarent@gmail.com',
          Assigned_Trainer: 'demo@example.com',
          Training_Status: 'Ongoing',
          Completed_Date: '',
          Work_Type: 'Training',
        },
        HEADERS[SHEETS.CLIENTS]
      ),
    ],
    [SHEETS.SESSIONS]: [
      HEADERS[SHEETS.SESSIONS],
      objectToRow(
        {
          Session_ID: createId('SS'),
          Client_ID: clientId,
          Calendar_Event_ID: createId('EVT'),
          Session_Title: 'Product onboarding',
          Start_Time: start.toISOString(),
          End_Time: end.toISOString(),
          Trainer_Email: 'demo@example.com',
          Status: 'Scheduled',
          Session_Type: 'Training',
          Cancel_Reason: '',
        },
        HEADERS[SHEETS.SESSIONS]
      ),
    ],
    [SHEETS.LOGS]: [HEADERS[SHEETS.LOGS]],
  };
};

const readDb = () => {
  const raw = localStorage.getItem(STORAGE_KEYS.MOCK_DB);
  if (!raw) {
    const seeded = seedDb();
    localStorage.setItem(STORAGE_KEYS.MOCK_DB, JSON.stringify(seeded));
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.ANWAR || !parsed[SHEETS.INTERACTIONS]) {
      const seeded = seedDb();
      localStorage.setItem(STORAGE_KEYS.MOCK_DB, JSON.stringify(seeded));
      return seeded;
    }
    return parsed;
  } catch {
    const fallback = seedDb();
    localStorage.setItem(STORAGE_KEYS.MOCK_DB, JSON.stringify(fallback));
    return fallback;
  }
};

const writeDb = (db) => localStorage.setItem(STORAGE_KEYS.MOCK_DB, JSON.stringify(db));

const getRows = (sheetName) => readDb()[sheetName] || [HEADERS[sheetName] || LEAD_HEADERS];

export const mockEnsureWorkbook = async () => {
  const db = readDb();
  if (!db.ANWAR) Object.assign(db, seedDb());
  db[SHEETS.CLIENTS] = db[SHEETS.CLIENTS] || [HEADERS[SHEETS.CLIENTS]];
  db[SHEETS.SESSIONS] = db[SHEETS.SESSIONS] || [HEADERS[SHEETS.SESSIONS]];
  writeDb(db);
  return true;
};

export const mockGetLeadSheets = async () => {
  const db = readDb();
  return Object.keys(db).filter((name) => Array.isArray(db[name]) && isLeadSheet(db[name]));
};

const isLeadSheet = (rows) => {
  const header = rows[0] || [];
  return header.includes('Customer Name') && header.includes('Status');
};

export const mockGetLeads = async () => {
  const db = readDb();
  const sheets = await mockGetLeadSheets();
  return sheets.flatMap((name) =>
    rowsToObjects(db[name], LEAD_HEADERS).map((lead) => ({ ...lead, _sheet: name }))
  );
};

export const mockAddLead = async (lead) => {
  const db = readDb();
  const sheetName = lead._sheet || String(lead.Executive || 'ANWAR').trim().toUpperCase();
  db[sheetName] = db[sheetName] || [LEAD_HEADERS];
  const existing = rowsToObjects(db[sheetName], LEAD_HEADERS);
  const nextNo = existing.reduce((max, row) => Math.max(max, Number(row['Sl No']) || 0), 0) + 1;
  const payload = { ...lead, 'Sl No': lead['Sl No'] || String(nextNo), _sheet: sheetName };
  db[sheetName].push(objectToRow(payload, LEAD_HEADERS));
  writeDb(db);
  return { ...payload, _row: db[sheetName].length };
};

export const mockUpdateLead = async (lead, patch) => {
  const db = readDb();
  const sheetName = patch._sheet || lead._sheet;
  const rows = db[sheetName];
  if (!rows || !lead._row) throw new Error('Lead not found');
  const next = { ...lead, ...patch };
  rows[lead._row - 1] = objectToRow(next, LEAD_HEADERS);
  db[sheetName] = rows;
  writeDb(db);
  return next;
};

export const mockGetObjects = async (sheetName) => rowsToObjects(getRows(sheetName), HEADERS[sheetName] || []);

export const mockAppend = async (sheetName, obj) => {
  const db = readDb();
  const headers = HEADERS[sheetName] || INTERACTION_HEADERS;
  db[sheetName] = db[sheetName] || [headers];
  db[sheetName].push(objectToRow(obj, headers));
  writeDb(db);
  return obj;
};

export const mockUpdateById = async (sheetName, idHeader, id, patch) => {
  const db = readDb();
  const headers = HEADERS[sheetName];
  const col = headers.indexOf(idHeader);
  const rows = db[sheetName] || [headers];
  const index = rows.findIndex((row, i) => i > 0 && row[col] === id);
  if (index < 0) throw new Error(`${idHeader} ${id} not found in ${sheetName}`);
  const current = rowsToObjects([headers, rows[index]], headers)[0];
  const next = { ...current, ...patch };
  rows[index] = objectToRow(next, headers);
  db[sheetName] = rows;
  writeDb(db);
  return next;
};

export const mockCreateCalendarEvent = async ({ title, start, end, attendees }) => ({
  id: createId('EVT'),
  hangoutLink: `https://meet.google.com/demo-${Math.random().toString(36).slice(2, 8)}`,
  htmlLink: 'https://calendar.google.com',
  summary: title,
  start,
  end,
  attendees,
});

export const mockPatchCalendarEvent = async (eventId, { start, end }) => ({
  id: eventId,
  start,
  end,
});

export const mockSessionsForTrainerOnDate = async (trainerEmail, date) => {
  const sessions = await mockGetObjects(SHEETS.SESSIONS);
  return sessions.filter(
    (session) =>
      session.Trainer_Email === trainerEmail &&
      sameDay(session.Start_Time, date) &&
      session.Status !== 'Cancelled' &&
      session.Status !== 'Completed'
  );
};

export const mockAppendStage = appendStageComment;

export const ROLES = {
  SALES: 'sales',
  TRAINING: 'training',
};

export const ROLE_LABELS = {
  [ROLES.SALES]: 'Sales Executive',
  [ROLES.TRAINING]: 'Technical / Training Member',
};

export const SYSTEM_SHEETS = {
  SETTINGS: 'Settings',
  AUDIT: 'Audit Log',
  ANALYTICS: 'CRM Analytics',
  INTERACTIONS: 'Interaction History',
};

export const SHEETS = {
  ...SYSTEM_SHEETS,
  NO_RESPONSE: 'No Response-Sheet',
  CLIENTS: 'Training_Clients',
  SESSIONS: 'Training_Sessions',
  LOGS: 'Daily_Worklogs_Leaves',
};

export const LEAD_HEADERS = [
  'Sl No',
  'Executive',
  'Date',
  'Customer Name',
  'Email ID',
  'Contact Number',
  'Source',
  'Source(Remarks)',
  'Country',
  'State',
  'Language',
  'City',
  'Specialization',
  'Region',
  'Status',
  'Comments',
  'Scheduled Date',
];

export const INTERACTION_HEADERS = [
  'Timestamp',
  'Sheet Name',
  'Client Name',
  'Executive',
  'Channel',
  'Notes',
  'Scheduled Date',
];

export const AUDIT_HEADERS = ['Timestamp', 'User Email', 'Action Taken', 'Client Reference'];

export const SETTINGS_HEADERS = ['Active CRM Sheets'];

export const HEADERS = {
  [SHEETS.SETTINGS]: SETTINGS_HEADERS,
  [SHEETS.AUDIT]: AUDIT_HEADERS,
  [SHEETS.INTERACTIONS]: INTERACTION_HEADERS,
  [SHEETS.NO_RESPONSE]: LEAD_HEADERS,
  [SHEETS.CLIENTS]: [
    'Client_ID',
    'Lead_ID',
    'Client_Name',
    'Contact_Email',
    'Assigned_Trainer',
    'Training_Status',
    'Completed_Date',
  ],
  [SHEETS.SESSIONS]: [
    'Session_ID',
    'Client_ID',
    'Calendar_Event_ID',
    'Session_Title',
    'Start_Time',
    'End_Time',
    'Trainer_Email',
    'Status',
  ],
  [SHEETS.LOGS]: [
    'Log_ID',
    'User_Email',
    'Date',
    'Entry_Type',
    'Work_Summary',
    'Leave_Reason',
    'Rescheduled_Sessions',
  ],
};

export const PIPELINE_STATUSES = [
  'New',
  'Enquiry',
  'Job Enquiry',
  'No Response',
  'Follow up for Demo',
  'Demo Scheduled',
  'Demo Done',
  'Demo Done-Postpone',
  'Interested',
  'Paid for Trial',
  'In Follow up',
  'Follow up - 1 Month',
  'Follow up - 2 Month',
  'Follow up - 6 Months',
  'Follow up - 1 Year',
  'Existing user',
  'Existing Follow up',
  'Demo Done-Closed',
  'Not Interested',
  'Demo Done-Not Interested',
  'Bought another software',
  'Invalid Number',
  'Not a Doctor',
  'Duplicate',
];

export const STATUS_GROUPS = {
  All: PIPELINE_STATUSES,
  Open: ['New', 'Enquiry', 'Job Enquiry', 'No Response', 'Interested'],
  Demo: ['Follow up for Demo', 'Demo Scheduled', 'Demo Done', 'Demo Done-Postpone', 'Paid for Trial'],
  'Follow up': [
    'In Follow up',
    'Follow up - 1 Month',
    'Follow up - 2 Month',
    'Follow up - 6 Months',
    'Follow up - 1 Year',
    'Existing user',
    'Existing Follow up',
  ],
  Won: ['Demo Done-Closed'],
  Lost: [
    'Not Interested',
    'Demo Done-Not Interested',
    'Bought another software',
    'Invalid Number',
    'Not a Doctor',
    'Duplicate',
  ],
};

export const STATUS_NEXT = {
  New: ['Follow up for Demo', 'Enquiry', 'Demo Scheduled', 'No Response', 'Invalid Number'],
  Enquiry: ['Follow up for Demo', 'Demo Scheduled', 'Interested', 'Not Interested', 'No Response'],
  'Job Enquiry': ['Not a Doctor', 'Enquiry', 'Not Interested'],
  'Follow up for Demo': ['Demo Scheduled', 'No Response', 'Not Interested'],
  'Demo Scheduled': ['Demo Done', 'No Response', 'Demo Done-Postpone'],
  'Demo Done': [
    'Interested',
    'Demo Done-Closed',
    'Demo Done-Not Interested',
    'Paid for Trial',
    'Demo Done-Postpone',
    'Bought another software',
  ],
  'Demo Done-Postpone': ['Demo Scheduled', 'Demo Done', 'Not Interested'],
  Interested: ['Demo Done-Closed', 'In Follow up', 'Paid for Trial', 'Not Interested'],
  'Paid for Trial': ['Demo Done-Closed', 'In Follow up', 'Not Interested'],
  'In Follow up': ['Demo Done-Closed', 'Follow up - 1 Month', 'Not Interested'],
  'Follow up - 1 Month': ['Follow up - 2 Month', 'Demo Done-Closed', 'Not Interested'],
  'Follow up - 2 Month': ['Follow up - 6 Months', 'Demo Done-Closed', 'Not Interested'],
  'Follow up - 6 Months': ['Follow up - 1 Year', 'Demo Done-Closed', 'Not Interested'],
  'Follow up - 1 Year': ['Demo Done-Closed', 'Not Interested', 'No Response'],
  'No Response': ['Follow up for Demo', 'Demo Scheduled', 'Invalid Number', 'Not Interested'],
  'Existing user': ['Existing Follow up', 'Demo Done-Closed', 'Not Interested'],
  'Existing Follow up': ['Demo Done-Closed', 'Follow up - 1 Month', 'Not Interested'],
};

export const CLOSE_OUTCOMES = [
  'Demo Done-Closed',
  'Not Interested',
  'Demo Done-Not Interested',
  'Bought another software',
];

export const LEAD_SOURCES = [
  'Online leads',
  'Meta Ads',
  'Meta Form',
  'Google Ads',
  'Website',
  'Mobile App leads',
  'Mail',
  'Call',
  'Whatsapp',
  'Tawkto',
  'Tech Jocky',
  'Google Display Ads',
];

export const SPECIALIZATIONS = [
  'Dentistry',
  'Dermatology',
  'Gynecology',
  'Pediatrics',
  'Ayurveda',
  'Homeopathy',
  'ENT',
  'Orthopedics',
  'Ophthalmology',
  'Cardiology',
  'General',
  'Physiotherapy',
  'Psychiatry',
  'Veterinary',
  'None of the Above',
];

export const REGIONS = ['Domestic', 'International'];
export const LANGUAGES = ['English', 'Hindi', 'Malayalam', 'Tamil', 'Kannada', 'Telugu'];
export const INTERACTION_CHANNELS = ['Comment', 'Call', 'Whatsapp', 'Mail'];

export const TRAINING_TEAM = [
  { name: 'Demo Trainer', email: 'demo@example.com' },
  { name: 'Anjali Kumar', email: 'anjali.training@example.com' },
  { name: 'Ravi Menon', email: 'ravi.training@example.com' },
];

export const listTrainingTeam = ({ clients = [], sessions = [], extra = [] } = {}) => {
  const map = new Map();
  TRAINING_TEAM.forEach((member) => map.set(member.email.toLowerCase(), member));
  extra.filter(Boolean).forEach((email) => {
    const key = String(email).trim().toLowerCase();
    if (key && !map.has(key)) map.set(key, { name: email, email });
  });
  clients.forEach((client) => {
    const email = String(client.Assigned_Trainer || '').trim();
    const key = email.toLowerCase();
    if (email && !map.has(key)) map.set(key, { name: email, email });
  });
  sessions.forEach((session) => {
    const email = String(session.Trainer_Email || '').trim();
    const key = email.toLowerCase();
    if (email && !map.has(key)) map.set(key, { name: email, email });
  });
  return [...map.values()];
};

export const trainerLabel = (email) => {
  const member = TRAINING_TEAM.find((item) => item.email.toLowerCase() === String(email || '').trim().toLowerCase());
  return member ? `${member.name} (${member.email})` : email || 'Unassigned';
};

export const TRAINING_STATUSES = ['Pending Assignment', 'In Progress', 'Completed'];
export const SESSION_STATUSES = ['Scheduled', 'Rescheduled', 'Completed', 'Cancelled'];
export const MESSAGE_TYPES = INTERACTION_CHANNELS;
export const SENDER_TEAMS = ['Sales', 'Training'];
export const ENTRY_TYPES = {
  WORK: 'Work Log',
  LEAVE: 'Leave',
};

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

export const DISCOVERY_DOCS = [
  'https://sheets.googleapis.com/$discovery/rest?version=v4',
  'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
];

export const POLL_INTERVAL_MS = 20000;

export const STORAGE_KEYS = {
  TOKEN: 'crm_access_token',
  TOKEN_EXP: 'crm_token_exp',
  USER: 'crm_user',
  ROLE: 'crm_role',
  CLIENT_ID: 'crm_google_client_id',
  API_KEY: 'crm_google_api_key',
  SPREADSHEET_ID: 'crm_spreadsheet_id',
  CALENDAR_ID: 'crm_calendar_id',
  DEMO_MODE: 'crm_demo_mode',
  MOCK_DB: 'crm_mock_db_v4',
};

export const createId = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();

export const nowIso = () => new Date().toISOString();

export const todayInput = () => new Date().toISOString().slice(0, 10);

export const pad = (n) => String(n).padStart(2, '0');

export const formatDdMmYyyy = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

export const formatDdMmYyyyHm = (value = new Date()) => {
  const date = value instanceof Date ? value : parseSheetDate(value);
  if (!date) return String(value || '');
  return `${formatDdMmYyyy(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const CALL_SOON_MS = 5 * 60 * 1000;

export const hasClockTime = (value) => /\d{1,2}:\d{2}/.test(String(value || ''));

export const getLeadScheduleAt = (lead) => {
  const raw = lead?.['Scheduled Date'];
  if (!raw) return null;
  const date = parseSheetDate(raw);
  if (!date) return null;
  if (!hasClockTime(raw)) date.setHours(9, 0, 0, 0);
  return date;
};

export const getCallScheduleState = (lead, now = new Date()) => {
  if (!lead || isClosedStatus(lead.Status)) return 'none';
  const at = getLeadScheduleAt(lead);
  if (!at) return 'none';
  const diff = at.getTime() - now.getTime();
  if (diff < 0) return 'overdue';
  if (diff <= CALL_SOON_MS) return 'soon';
  return 'upcoming';
};

export const formatScheduleRelative = (date, now = new Date()) => {
  if (!date) return '—';
  const ms = date.getTime() - now.getTime();
  const mins = Math.round(Math.abs(ms) / 60000);
  if (mins < 1) return ms < 0 ? 'just passed' : 'now';
  if (mins < 60) return ms < 0 ? `${mins} min overdue` : `in ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return ms < 0 ? `${hours}h overdue` : `in ${hours}h`;
  const days = Math.round(hours / 24);
  return ms < 0 ? `${days}d overdue` : `in ${days}d`;
};

export const toLocalInput = (value) => {
  if (!value) return '';
  const date = parseSheetDate(value);
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const toDateInput = (value) => {
  const date = value instanceof Date ? value : parseSheetDate(value);
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const toTimeInput = (value) => {
  if (value instanceof Date) return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
  if (!hasClockTime(value)) return '';
  const date = parseSheetDate(value);
  if (!date) return '';
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const combineDateAndTime = (dateInput, timeInput) => {
  if (!dateInput && !timeInput) return '';
  const datePart = dateInput || toDateInput(new Date());
  const [year, month, day] = datePart.split('-').map(Number);
  if (!timeInput) return formatDdMmYyyy(new Date(year, month - 1, day));
  const [hour = 0, minute = 0] = timeInput.split(':').map(Number);
  return formatDdMmYyyyHm(new Date(year, month - 1, day, hour, minute));
};

export const fromLocalInput = (value) => (value ? new Date(value).toISOString() : '');

export const parseSheetDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const raw = String(value).trim();
  const iso = new Date(raw);
  if (!Number.isNaN(iso.getTime()) && !/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(raw)) return iso;
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!match) return Number.isNaN(iso.getTime()) ? null : iso;
  const [, d, m, y, hh = '0', mm = '0'] = match;
  const year = y.length === 2 ? 2000 + Number(y) : Number(y);
  const date = new Date(year, Number(m) - 1, Number(d), Number(hh), Number(mm));
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDateTime = (value) => {
  if (!value) return '—';
  const date = parseSheetDate(value);
  if (!date) return String(value);
  return date.toLocaleString();
};

export const formatDate = (value) => {
  if (!value) return '—';
  const date = parseSheetDate(value);
  if (!date) return String(value);
  return date.toLocaleDateString();
};

export const sameDay = (iso, dateStr) => {
  if (!iso || !dateStr) return false;
  const date = parseSheetDate(iso);
  if (!date) return String(iso).startsWith(dateStr);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` === dateStr;
};

export const getTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export const isLeadHeaderRow = (row = []) => {
  const cells = row.map((cell) => String(cell || '').trim().toLowerCase());
  return cells.includes('customer name') && cells.includes('status');
};

export const rowsToObjects = (rows = [], headers = []) => {
  if (!rows.length) return [];
  const headerIndex = rows.findIndex((row) => looksLikeHeader(row, headers) || isLeadHeaderRow(row));
  const start = headerIndex >= 0 ? headerIndex + 1 : 0;
  const objects = [];
  for (let i = start; i < rows.length; i += 1) {
    const row = rows[i] || [];
    if (!row.some((cell) => String(cell || '').trim() !== '')) continue;
    const obj = { _row: i + 1 };
    headers.forEach((header, col) => {
      obj[header] = row[col] ?? '';
    });
    objects.push(obj);
  }
  return objects;
};

export const objectToRow = (obj = {}, headers = []) => headers.map((header) => obj[header] ?? '');

const looksLikeHeader = (row = [], headers = []) =>
  headers.filter(Boolean).some((header, index) => String(row[index] || '').trim() === header);

export const normalizeStatus = (status = '') => {
  const value = String(status).trim();
  const map = {
    'Follow up- 1 Month': 'Follow up - 1 Month',
    'Demo Done - Closed': 'Demo Done-Closed',
    'Demo Done - Not Interested': 'Demo Done-Not Interested',
    'Existing User': 'Existing user',
    'Not Intrested': 'Not Interested',
    'In follow up': 'In Follow up',
    'follow up': 'In Follow up',
  };
  return map[value] || value;
};

export const pipelineColor = (status) => {
  const normalized = normalizeStatus(status);
  const map = {
    New: 'bg-slate-100 text-slate-700',
    Enquiry: 'bg-violet-100 text-violet-800',
    'Job Enquiry': 'bg-violet-100 text-violet-800',
    'No Response': 'bg-zinc-100 text-zinc-700',
    'Follow up for Demo': 'bg-sky-100 text-sky-800',
    'Demo Scheduled': 'bg-indigo-100 text-indigo-800',
    'Demo Done': 'bg-blue-100 text-blue-800',
    'Demo Done-Postpone': 'bg-amber-100 text-amber-800',
    Interested: 'bg-cyan-100 text-cyan-800',
    'Paid for Trial': 'bg-teal-100 text-teal-800',
    'In Follow up': 'bg-amber-100 text-amber-800',
    'Follow up - 1 Month': 'bg-amber-100 text-amber-800',
    'Follow up - 2 Month': 'bg-amber-100 text-amber-800',
    'Follow up - 6 Months': 'bg-orange-100 text-orange-800',
    'Follow up - 1 Year': 'bg-orange-100 text-orange-800',
    'Existing user': 'bg-slate-100 text-slate-700',
    'Existing Follow up': 'bg-slate-100 text-slate-700',
    'Demo Done-Closed': 'bg-emerald-100 text-emerald-800',
    'Not Interested': 'bg-rose-100 text-rose-800',
    'Demo Done-Not Interested': 'bg-rose-100 text-rose-800',
    'Bought another software': 'bg-rose-100 text-rose-800',
    'Invalid Number': 'bg-zinc-200 text-zinc-700',
    'Not a Doctor': 'bg-zinc-200 text-zinc-700',
    Duplicate: 'bg-zinc-200 text-zinc-700',
  };
  return map[normalized] || 'bg-slate-100 text-slate-700';
};

export const trainingColor = (status) => {
  const map = {
    'Pending Assignment': 'bg-amber-100 text-amber-800',
    'In Progress': 'bg-sky-100 text-sky-800',
    Completed: 'bg-emerald-100 text-emerald-800',
  };
  return map[status] || 'bg-slate-100 text-slate-700';
};

export const sessionColor = (status) => {
  const map = {
    Scheduled: 'bg-sky-100 text-sky-800',
    Rescheduled: 'bg-amber-100 text-amber-800',
    Completed: 'bg-emerald-100 text-emerald-800',
    Cancelled: 'bg-rose-100 text-rose-800',
  };
  return map[status] || 'bg-slate-100 text-slate-700';
};

export const nextPipelineStatus = (status) => (STATUS_NEXT[normalizeStatus(status)] || [])[0] || status;

export const nextSalesActions = (status) => STATUS_NEXT[normalizeStatus(status)] || [];

export const isDemoStatus = (status) => {
  const value = normalizeStatus(status);
  return value === 'Follow up for Demo' || value === 'New' || value === 'Enquiry' || value === 'Demo Done-Postpone';
};

export const isClosedStatus = (status) => STATUS_GROUPS.Won.concat(STATUS_GROUPS.Lost).includes(normalizeStatus(status));

export const isCompletedLead = (lead) => normalizeStatus(lead?.Status) === 'Demo Done-Closed';

export const COMPLETED_LEAD_DRAG = 'application/x-crm-completed-lead';
export const COMPLETED_LEAD_DRAG_TEXT = 'text/x-completed-lead';

export const setCompletedLeadDrag = (event, lead) => {
  const payload = JSON.stringify({ kind: 'lead', key: leadKey(lead) });
  event.dataTransfer.setData(COMPLETED_LEAD_DRAG, leadKey(lead));
  event.dataTransfer.setData(COMPLETED_LEAD_DRAG_TEXT, leadKey(lead));
  event.dataTransfer.setData('text/plain', payload);
  event.dataTransfer.effectAllowed = 'copy';
};

export const isCompletedLeadDrag = (event) => {
  const types = Array.from(event.dataTransfer?.types || []);
  return types.includes(COMPLETED_LEAD_DRAG) || types.includes(COMPLETED_LEAD_DRAG_TEXT);
};

export const parseStageComments = (value) => {
  const text = String(value || '')
    .replace(/\r\n/g, '\n')
    .trim();
  if (!text) return [];

  const chunks = text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?=Stage\s*\d+)/i))
    .map((line) => line.trim())
    .filter(Boolean);

  return chunks.map((chunk, index) => {
    const match = chunk.match(/^Stage\s*(\d+)\s*[:.\-]?\s*(.*)$/i);
    const num = match ? Number(match[1]) : index + 1;
    const message = (match ? match[2] : chunk).replace(/^\(([^)]+)\)\s*/, '').trim();
    return {
      num,
      message,
      raw: `Stage ${num} ${message}`.trim(),
    };
  });
};

export const appendStageComment = (existing, note) => {
  const message = String(note || '')
    .replace(/^Stage\s*\d+\s*/i, '')
    .trim();
  if (!message) return String(existing || '');
  const items = parseStageComments(existing);
  const nextNum = items.reduce((max, item) => Math.max(max, Number(item.num) || 0), 0) + 1;
  const next = `Stage ${nextNum} ${message}`;
  const current = items.map((item) => item.raw).join('\n');
  return `${current ? `${current}\n` : ''}${next}\n`;
};

export const leadKey = (lead) => `${lead._sheet || ''}#${lead._row || lead['Sl No']}`;

export const trainingLeadId = (lead) => `${lead._sheet || ''}#${lead['Sl No']}`;

export const findClientForLead = (clients = [], lead) => {
  if (!lead) return null;
  const id = trainingLeadId(lead);
  return (
    clients.find((client) => client.Lead_ID === id) ||
    clients.find(
      (client) =>
        client.Client_Name === lead['Customer Name'] &&
        client.Contact_Email &&
        client.Contact_Email === lead['Email ID']
    ) ||
    null
  );
};

export const findLeadForClient = (leads = [], client) => {
  if (!client) return null;
  return (
    leads.find((lead) => trainingLeadId(lead) === client.Lead_ID) ||
    leads.find(
      (lead) =>
        lead['Customer Name'] === client.Client_Name &&
        (!client.Contact_Email || lead['Email ID'] === client.Contact_Email)
    ) ||
    null
  );
};

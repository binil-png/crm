export const ROLES = {
  SALES: 'sales',
  TRAINING: 'training',
  CONFIG: 'config',
};

export const ROLE_LABELS = {
  [ROLES.SALES]: 'Sales',
  [ROLES.TRAINING]: 'Technical support',
  [ROLES.CONFIG]: 'Configuration',
};

export const USER_TYPES = ['Sales', 'Technical support'];
export const USER_ROLES = ['Team member', 'Team lead', 'Admin'];

export const DEMO_ACCOUNTS = [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    userType: 'Sales',
    userRole: 'Admin',
    label: 'Admin',
    description: 'Sales and training workspaces, users, and leave approval.',
  },
  {
    name: 'Sales Person',
    email: 'sales@example.com',
    userType: 'Sales',
    userRole: 'Team member',
    label: 'Sales person',
    description: 'Leads, call schedules, and passing clients to training.',
  },
  {
    name: 'Training Person',
    email: 'training@example.com',
    userType: 'Technical support',
    userRole: 'Team member',
    label: 'Training person',
    description: 'Calendar, sessions, assigned clients, and work log.',
  },
];

export const normalizeUserType = (value) => {
  const text = String(value || '').trim().toLowerCase();
  if (text.includes('technical') || text.includes('training') || text.includes('support')) return 'Technical support';
  if (text.includes('sales')) return 'Sales';
  return '';
};

export const normalizeUserRole = (value) => {
  const text = String(value || '').trim().toLowerCase();
  if (text.includes('admin')) return 'Admin';
  if (text.includes('lead')) return 'Team lead';
  if (text.includes('member')) return 'Team member';
  return 'Team member';
};

export const userTypeToAppRole = (value) =>
  normalizeUserType(value) === 'Technical support' ? ROLES.TRAINING : ROLES.SALES;

export const isAdminRole = (value) => normalizeUserRole(value) === 'Admin';
export const isLeadRole = (value) => {
  const role = normalizeUserRole(value);
  return role === 'Admin' || role === 'Team lead';
};

export const SYSTEM_SHEETS = {
  SETTINGS: 'Settings',
  AUDIT: 'Audit Log',
  ANALYTICS: 'CRM Analytics',
  INTERACTIONS: 'Interaction History',
  USERS: 'Users',
  WORKBOOK_CONFIG: 'Workbook_Config',
};

export const SHEETS = {
  ...SYSTEM_SHEETS,
  NO_RESPONSE: 'No Response-Sheet',
  CLIENTS: 'Training_Clients',
  SESSIONS: 'Training_Sessions',
  LOGS: 'Daily_Worklogs_Leaves',
};

export const TRAINING_WORKBOOK_SHEETS = [SHEETS.CLIENTS, SHEETS.SESSIONS, SHEETS.LOGS];

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

export const WORKBOOK_KEYS = {
  SALES: 'Sales',
  TRAINING: 'Training',
  EMPLOYEES: 'Employees',
  USERS: 'Users',
};

export const HARDCODED_CONFIG_SPREADSHEET_ID = '16O-ay51W8RFyTNS-lokAciuAkxj_P5r9hbqWuefz45s';

export const WORKBOOK_CONFIG_HEADERS = [
  'Workbook',
  'Google Account',
  'Spreadsheet ID',
  'Updated At',
  'Updated By',
];

export const USER_HEADERS = [
  'Username',
  'Email',
  'User Type',
  'User Role',
  'Calendar ID',
  'Last Login',
  'Registered',
  'Sheet Name',
];

export const parseSpreadsheetId = (value) => {
  const text = String(value || '').trim();
  const fromUrl = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i);
  if (fromUrl) return fromUrl[1];
  return text.replace(/\s+/g, '');
};

export const normalizeRegistered = (value) => {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return true;
  return ['yes', 'y', 'true', '1', 'registered'].includes(text);
};

export const HEADERS = {
  [SHEETS.SETTINGS]: SETTINGS_HEADERS,
  [SHEETS.WORKBOOK_CONFIG]: WORKBOOK_CONFIG_HEADERS,
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
    'Work_Type',
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
    'Session_Type',
    'Cancel_Reason',
    'Calendar_ID',
    'Cancelled_At',
  ],
  [SHEETS.LOGS]: [
    'Log_ID',
    'User_Email',
    'Date',
    'Entry_Type',
    'Work_Summary',
    'Leave_Reason',
    'Rescheduled_Sessions',
    'Leave_Status',
    'Reviewed_By',
  ],
  [SHEETS.USERS]: USER_HEADERS,
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
  { name: 'Training Person', email: 'training@example.com' },
  { name: 'Admin User', email: 'admin@example.com' },
];

const decodeCalendarValue = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
};

const calendarIdFromUrl = (value) => {
  const raw = String(value || '').trim();
  if (!/^https?:\/\//i.test(raw) && !/calendar\.google\.com/i.test(raw)) return decodeCalendarValue(raw);
  try {
    const url = new URL(raw);
    const fromQuery = url.searchParams.get('src') || url.searchParams.get('cid');
    if (fromQuery) {
      const decoded = decodeCalendarValue(fromQuery);
      if (decoded.includes('@') || decoded.toLowerCase() === 'primary') return decoded;
      try {
        const fromBase64 = atob(decoded);
        if (fromBase64.includes('@')) return fromBase64.trim();
      } catch {
        return decoded;
      }
      return decoded;
    }
    const ical = raw.match(/\/calendar\/ical\/([^/]+)/i);
    if (ical) return decodeCalendarValue(ical[1]);
  } catch {
    return decodeCalendarValue(raw);
  }
  return decodeCalendarValue(raw);
};

export const normalizeCalendarId = (value, email = '') => {
  const address = String(email || '').trim();
  const stored = calendarIdFromUrl(value);
  if (stored && stored.toLowerCase() !== 'primary') return stored;
  return address || stored || 'primary';
};

export const calendarIdForEmail = (email, users = [], fallback = 'primary') => {
  const key = String(email || '').trim().toLowerCase();
  const row = users.find((item) => String(item.Email || '').trim().toLowerCase() === key);
  if (row) return normalizeCalendarId(row['Calendar ID'], row.Email);
  return String(email || '').trim() || fallback;
};

export const sameEmail = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase() && Boolean(String(a || '').trim());

export const listTrainingTeam = ({ clients = [], sessions = [], users = [], extra = [], currentEmail = '' } = {}) => {
  const map = new Map();
  users.forEach((row) => {
    const type = normalizeUserType(row['User Type']);
    if (type && type !== 'Technical support' && !isAdminRole(row['User Role'])) return;
    const email = String(row.Email || '').trim();
    if (!email) return;
    map.set(email.toLowerCase(), {
      name: row.Username || email,
      email,
      calendarId: normalizeCalendarId(row['Calendar ID'], email),
    });
  });
  if (!users.length) {
    TRAINING_TEAM.forEach((member) => {
      if (!map.has(member.email.toLowerCase())) {
        map.set(member.email.toLowerCase(), { ...member, calendarId: member.email });
      }
    });
  }
  extra.filter(Boolean).forEach((email) => {
    const key = String(email).trim().toLowerCase();
    if (key && !map.has(key)) map.set(key, { name: email, email, calendarId: calendarIdForEmail(email, users, email) });
  });
  clients.forEach((client) => {
    const email = String(client.Assigned_Trainer || '').trim();
    const key = email.toLowerCase();
    if (email && !map.has(key)) map.set(key, { name: email, email, calendarId: calendarIdForEmail(email, users, email) });
  });
  sessions.forEach((session) => {
    const email = String(session.Trainer_Email || '').trim();
    const key = email.toLowerCase();
    if (email && !map.has(key)) map.set(key, { name: email, email, calendarId: calendarIdForEmail(email, users, email) });
  });
  const current = String(currentEmail || '').trim().toLowerCase();
  return [...map.values()].sort((a, b) => {
    const aMine = a.email.toLowerCase() === current;
    const bMine = b.email.toLowerCase() === current;
    if (aMine && !bMine) return -1;
    if (bMine && !aMine) return 1;
    return String(a.name || a.email).localeCompare(String(b.name || b.email));
  });
};

export const trainerLabel = (email) => {
  const member = TRAINING_TEAM.find((item) => item.email.toLowerCase() === String(email || '').trim().toLowerCase());
  return member ? `${member.name} (${member.email})` : email || 'Unassigned';
};

export const TRAINING_STATUSES = ['Not started', 'Ongoing', 'Completed'];
export const WORK_TYPES = ['Training', 'Doubt clarification'];
export const SESSION_STATUSES = ['Scheduled', 'Rescheduled', 'Completed', 'Cancelled'];

export const normalizeTrainingStatus = (status = '') => {
  const value = String(status).trim();
  const map = {
    'Pending Assignment': 'Not started',
    Pending: 'Not started',
    'Not Started': 'Not started',
    'In Progress': 'Ongoing',
    'In progress': 'Ongoing',
  };
  return map[value] || TRAINING_STATUSES.find((item) => item === value) || 'Not started';
};

export const normalizeWorkType = (value = '') => {
  const raw = String(value).trim().toLowerCase();
  if (raw.includes('doubt')) return 'Doubt clarification';
  return 'Training';
};

export const isTrainingNotStarted = (client) => normalizeTrainingStatus(client?.Training_Status) === 'Not started';
export const isTrainingOngoing = (client) => normalizeTrainingStatus(client?.Training_Status) === 'Ongoing';
export const isTrainingCompleted = (client) => normalizeTrainingStatus(client?.Training_Status) === 'Completed';

export const clientWorkType = (client) => normalizeWorkType(client?.Work_Type);
export const sessionWorkType = (session) => normalizeWorkType(session?.Session_Type || session?.Work_Type);

export const sessionTitleForType = (type, clientName) =>
  normalizeWorkType(type) === 'Doubt clarification'
    ? `Doubt clarification · ${clientName}`
    : `Training · ${clientName}`;
export const MESSAGE_TYPES = INTERACTION_CHANNELS;
export const SENDER_TEAMS = ['Sales', 'Training'];
export const ENTRY_TYPES = {
  WORK: 'Work Log',
  LEAVE: 'Leave',
};
export const LEAVE_STATUSES = ['Pending', 'Approved', 'Rejected'];

export const leaveStatusOf = (log = {}) => {
  if (String(log.Entry_Type || '') !== ENTRY_TYPES.LEAVE) return '';
  const value = String(log.Leave_Status || '').trim();
  return LEAVE_STATUSES.includes(value) ? value : 'Pending';
};

export const leaveStatusColor = (status) => {
  const map = {
    Pending: 'bg-amber-100 text-amber-800',
    Approved: 'bg-emerald-100 text-emerald-800',
    Rejected: 'bg-rose-100 text-rose-800',
  };
  return map[status] || 'bg-slate-100 text-slate-600';
};

export const SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/gmail.send',
].join(' ');

export const DISCOVERY_DOCS = [
  'https://sheets.googleapis.com/$discovery/rest?version=v4',
  'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
];

export const POLL_INTERVAL_MS = 20000;
export const POLL_MAX_BACKOFF_MS = 5 * 60 * 1000;

export const STORAGE_KEYS = {
  TOKEN: 'crm_access_token',
  TOKEN_EXP: 'crm_token_exp',
  USER: 'crm_user',
  ROLE: 'crm_role',
  CLIENT_ID: 'crm_google_client_id',
  API_KEY: 'crm_google_api_key',
  SPREADSHEET_ID: 'crm_spreadsheet_id',
  TRAINING_SPREADSHEET_ID: 'crm_training_spreadsheet_id',
  EMPLOYEES_SPREADSHEET_ID: 'crm_employees_spreadsheet_id',
  CONFIG_SPREADSHEET_ID: 'crm_config_spreadsheet_id',
  SALES_GOOGLE_ACCOUNT: 'crm_sales_google_account',
  TRAINING_GOOGLE_ACCOUNT: 'crm_training_google_account',
  EMPLOYEES_GOOGLE_ACCOUNT: 'crm_employees_google_account',
  CALENDAR_ID: 'crm_calendar_id',
  DEMO_MODE: 'crm_demo_mode',
  MOCK_DB: 'crm_mock_db_v8',
  DIRECTORY: 'crm_directory_user',
};

export const createId = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();

export const nowIso = () => new Date().toISOString();

export const pad = (n) => String(n).padStart(2, '0');

export const parseSheetDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const raw = String(value).trim();
  if (!raw) return null;

  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (dmy) {
    const year = dmy[3].length === 2 ? 2000 + Number(dmy[3]) : Number(dmy[3]);
    const date = new Date(
      year,
      Number(dmy[2]) - 1,
      Number(dmy[1]),
      Number(dmy[4] || 0),
      Number(dmy[5] || 0),
      Number(dmy[6] || 0)
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const localIso = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (localIso) {
    const date = new Date(
      Number(localIso[1]),
      Number(localIso[2]) - 1,
      Number(localIso[3]),
      Number(localIso[4] || 0),
      Number(localIso[5] || 0),
      Number(localIso[6] || 0)
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const iso = new Date(raw);
  return Number.isNaN(iso.getTime()) ? null : iso;
};

export const formatDdMmYyyy = (value = new Date()) => {
  const date = value instanceof Date ? value : parseSheetDate(value);
  if (!date || Number.isNaN(date.getTime())) return String(value || '');
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
};

export const formatDdMmYyyyHm = (value = new Date()) => {
  const date = value instanceof Date ? value : parseSheetDate(value);
  if (!date) return String(value || '');
  return `${formatDdMmYyyy(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const todayInput = () => formatDdMmYyyy(new Date());

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

export const isCallCompleted = (lead) => {
  const items = parseStageComments(lead?.Comments);
  let last = '';
  items.forEach((item) => {
    const message = String(item.message || '');
    if (/^call scheduled/i.test(message) || /^call completed/i.test(message) || /^call done/i.test(message)) {
      last = message;
    }
  });
  return /^call completed|^call done/i.test(last);
};

export const getCallScheduleState = (lead, now = new Date()) => {
  if (!lead || isClosedStatus(lead.Status) || isCallCompleted(lead)) return 'none';
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
  return formatDdMmYyyy(date);
};

export const toNativeDateValue = (value) => {
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
  const datePart = dateInput || formatDdMmYyyy(new Date());
  const parsed = parseSheetDate(timeInput ? `${datePart} ${timeInput}` : datePart);
  if (!parsed) return datePart;
  return timeInput ? formatDdMmYyyyHm(parsed) : formatDdMmYyyy(parsed);
};

export const fromLocalInput = (value) => {
  const date = parseSheetDate(value);
  return date ? date.toISOString() : '';
};

export const formatDateTime = (value) => {
  if (!value) return '—';
  const date = parseSheetDate(value);
  if (!date) return String(value);
  return formatDdMmYyyyHm(date);
};

export const formatDate = (value) => {
  if (!value) return '—';
  const date = parseSheetDate(value);
  if (!date) return String(value);
  return formatDdMmYyyy(date);
};

export const sameDay = (left, right) => {
  const a = parseSheetDate(left);
  const b = parseSheetDate(right);
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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
    'Not started': 'bg-amber-100 text-amber-800',
    Ongoing: 'bg-sky-100 text-sky-800',
    Completed: 'bg-emerald-100 text-emerald-800',
    'Pending Assignment': 'bg-amber-100 text-amber-800',
    'In Progress': 'bg-sky-100 text-sky-800',
  };
  return map[normalizeTrainingStatus(status)] || map[status] || 'bg-slate-100 text-slate-700';
};

export const workTypeColor = (type) =>
  normalizeWorkType(type) === 'Doubt clarification'
    ? 'bg-violet-100 text-violet-800'
    : 'bg-sky-100 text-sky-800';

export const sessionColor = (status) => {
  const map = {
    Scheduled: 'bg-sky-100 text-sky-800',
    Rescheduled: 'bg-amber-100 text-amber-800',
    Completed: 'bg-emerald-100 text-emerald-800',
    Cancelled: 'bg-rose-100 text-rose-800',
  };
  return map[status] || 'bg-slate-100 text-slate-700';
};

export const isCancelledSession = (session) => String(session?.Status || '').trim() === 'Cancelled';

export const sessionCancelReason = (session) => String(session?.Cancel_Reason || '').trim();

export const sessionCancelledAt = (session) => String(session?.Cancelled_At || '').trim();

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

export const removeStageComment = (existing, num) => {
  const remaining = parseStageComments(existing).filter((item) => Number(item.num) !== Number(num));
  if (!remaining.length) return '';
  return `${remaining.map((item, index) => `Stage ${index + 1} ${item.message}`.trim()).join('\n')}\n`;
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

export const clientLeadEmail = (client, leads = []) =>
  String(client?.Contact_Email || findLeadForClient(leads, client)?.['Email ID'] || '')
    .trim()
    .toLowerCase();

export const isValidLeadEmail = (value) => {
  const email = String(value || '').trim();
  return email.includes('@') && email.includes('.');
};

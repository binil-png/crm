import { useState } from 'react';
import { CalendarDays, Database, Sheet } from 'lucide-react';
import { getConfig, saveConfig } from '../../services/googleApi';

export default function SetupScreen({ onSaved }) {
  const existing = getConfig();
  const [choice, setChoice] = useState('');
  const [clientId, setClientId] = useState(existing.clientId);
  const [apiKey, setApiKey] = useState(existing.apiKey);
  const [configSpreadsheetId, setConfigSpreadsheetId] = useState(existing.configSpreadsheetId);
  const [spreadsheetId, setSpreadsheetId] = useState(existing.spreadsheetId);
  const [trainingSpreadsheetId, setTrainingSpreadsheetId] = useState(existing.trainingSpreadsheetId);
  const [employeesSpreadsheetId, setEmployeesSpreadsheetId] = useState(existing.employeesSpreadsheetId);
  const [calendarId, setCalendarId] = useState(existing.calendarId || 'primary');

  const saveGoogle = () => {
    if (!clientId.trim()) {
      window.alert('Google Client ID is required.');
      return;
    }
    if (!configSpreadsheetId.trim()) {
      window.alert('Configuration spreadsheet ID is required.');
      return;
    }
    saveConfig({
      clientId,
      apiKey,
      configSpreadsheetId,
      spreadsheetId,
      trainingSpreadsheetId,
      employeesSpreadsheetId,
      calendarId,
      demoMode: false,
    });
    onSaved(getConfig());
  };

  const saveLocal = () => {
    saveConfig({ demoMode: true });
    onSaved(getConfig());
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold">Sheets CRM</h1>
        <p className="mt-2 text-sm text-slate-600">Choose how this CRM stores data.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setChoice('google')}
            className={`rounded-lg border p-4 text-left ${choice === 'google' ? 'border-slate-900 bg-slate-50' : 'border-slate-200'}`}
          >
            <div className="flex items-center gap-2 text-slate-900">
              <Sheet size={18} />
              <CalendarDays size={18} />
              <h2 className="font-semibold">Google Sheets and Calendar</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Live data from your form Google Sheets. Sales calls and training sessions go to Google Calendar.
            </p>
          </button>

          <button
            type="button"
            onClick={saveLocal}
            className="rounded-lg border border-slate-200 p-4 text-left"
          >
            <div className="flex items-center gap-2 text-slate-900">
              <Database size={18} />
              <h2 className="font-semibold">Local setup</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Test in this browser only. Sample leads, users, training, and work logs stay in localStorage. No Google
              connection.
            </p>
          </button>
        </div>

        {choice === 'google' ? (
          <div className="mt-6 border-t border-slate-200 pt-5">
            <p className="text-sm font-medium text-slate-800">Google connection IDs</p>
            <label className="mt-4 block text-sm font-medium">Google OAuth Client ID</label>
            <input
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="xxxx.apps.googleusercontent.com"
            />

            <label className="mt-4 block text-sm font-medium">Google API Key (optional — never paste GOCSPX- client secret)</label>
            <input
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Used for gapi client init"
            />

            <label className="mt-4 block text-sm font-medium">Configuration spreadsheet ID</label>
            <input
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              value={configSpreadsheetId}
              onChange={(e) => setConfigSpreadsheetId(e.target.value)}
              placeholder="Google Sheet that stores Sales, Training, and User details IDs"
            />
            <p className="mt-1 text-xs text-slate-500">
              Required. This sheet’s Workbook_Config tab stores the three data spreadsheet IDs. Put
              VITE_GOOGLE_CONFIG_SPREADSHEET_ID in .env, or paste the ID here.
            </p>

            <label className="mt-4 block text-sm font-medium">Sales spreadsheet ID</label>
            <input
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              placeholder="Leads and interaction history"
            />

            <label className="mt-4 block text-sm font-medium">Training spreadsheet ID</label>
            <input
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              value={trainingSpreadsheetId}
              onChange={(e) => setTrainingSpreadsheetId(e.target.value)}
              placeholder="Training clients, sessions, and work logs"
            />

            <label className="mt-4 block text-sm font-medium">User details spreadsheet ID</label>
            <input
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              value={employeesSpreadsheetId}
              onChange={(e) => setEmployeesSpreadsheetId(e.target.value)}
              placeholder="Users tab only"
            />
            <p className="mt-1 text-xs text-slate-500">
              Use a different spreadsheet for each of these three. After sign-in, Admin can change the IDs; they
              are saved on the configuration sheet, not in the data workbooks.
            </p>

            <label className="mt-4 block text-sm font-medium">Calendar ID</label>
            <input
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              value={calendarId}
              onChange={(e) => setCalendarId(e.target.value)}
              placeholder="primary"
            />
            <p className="mt-1 text-xs text-slate-500">
              Use primary for the signed-in calendar, or a shared calendar ID. Training sessions can also use each user’s
              Calendar ID on the Users sheet.
            </p>

            <button type="button" onClick={saveGoogle} className="mt-5 rounded bg-slate-900 px-4 py-2 text-white">
              Connect Google Sheets and Calendar
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

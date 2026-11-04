import { useState } from 'react';
import { getConfig, saveConfig } from '../../services/googleApi';

export default function SetupScreen({ onSaved }) {
  const existing = getConfig();
  const [clientId, setClientId] = useState(existing.clientId);
  const [apiKey, setApiKey] = useState(existing.apiKey);
  const [spreadsheetId, setSpreadsheetId] = useState(existing.spreadsheetId);

  const save = (demoMode = false) => {
    if (!demoMode && (!clientId.trim() || !spreadsheetId.trim())) {
      window.alert('Google Client ID and Spreadsheet ID are required.');
      return;
    }
    saveConfig({ clientId, apiKey, spreadsheetId, demoMode });
    onSaved(getConfig());
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold">Connect Google workspace</h1>
        <p className="mt-2 text-sm text-slate-600">
          Create an OAuth client in Google Cloud, enable Sheets API v4 and Calendar API v3, then paste the IDs below.
          Share the spreadsheet with the Google account you will use to sign in.
        </p>

        <label className="mt-5 block text-sm font-medium">Google OAuth Client ID</label>
        <input
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="xxxx.apps.googleusercontent.com"
        />

        <label className="mt-4 block text-sm font-medium">Google API Key (optional)</label>
        <input
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Used for gapi client init"
        />

        <label className="mt-4 block text-sm font-medium">Spreadsheet ID</label>
        <input
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          value={spreadsheetId}
          onChange={(e) => setSpreadsheetId(e.target.value)}
          placeholder="From the Google Sheets URL"
        />

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={() => save(false)} className="rounded bg-slate-900 px-4 py-2 text-white">
            Save and continue
          </button>
          <button type="button" onClick={() => save(true)} className="rounded border border-slate-300 px-4 py-2">
            Use local demo mode
          </button>
        </div>
      </div>
    </div>
  );
}

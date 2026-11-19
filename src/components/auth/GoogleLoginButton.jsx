import { useEffect, useState } from 'react';
import { CalendarDays, Database, Sheet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isDemoMode, refreshAppSheetsStatus, resetConfig } from '../../services/googleApi';

export default function GoogleLoginButton() {
  const { login, enterLocalDemo, busy, error } = useAuth();
  const [appSheets, setAppSheets] = useState({ enabled: false, shareWith: '' });
  const demo = isDemoMode();

  useEffect(() => {
    refreshAppSheetsStatus().then(setAppSheets).catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold">Sheets CRM</h1>
        <p className="mt-2 text-sm text-slate-600">Choose how this CRM stores data.</p>
        {error ? <p className="mt-3 rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-900">
              <Sheet size={18} />
              <CalendarDays size={18} />
              <h2 className="font-semibold">Google Sheets and Calendar</h2>
            </div>
            <p className="mt-2 flex-1 text-sm text-slate-600">
              Live data. Leads and users come from your form Google Sheets. Sales calls and training sessions are written
              to Google Calendar.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {appSheets.enabled
                ? `Sheets are opened by the CRM app. Share both workbooks with ${appSheets.shareWith} as Editor.`
                : 'Sign in with the Gmail that has Editor access on the sales and training sheets.'}
            </p>
            <button
              type="button"
              onClick={login}
              disabled={busy}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
            >
              {busy && !demo ? 'Connecting…' : 'Connect Google Sheets and Calendar'}
            </button>
          </div>

          <div className="flex flex-col rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-900">
              <Database size={18} />
              <h2 className="font-semibold">Local setup</h2>
            </div>
            <p className="mt-2 flex-1 text-sm text-slate-600">
              Test in this browser only. Sample leads, users, training, and work logs are saved in localStorage. Google
              Sheets and Calendar are not used.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Signs in as Demo User (demo@example.com), Admin. Data key: crm_mock_db_v7.
            </p>
            <button
              type="button"
              onClick={() => enterLocalDemo()}
              disabled={busy}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded border border-slate-300 bg-white px-4 py-2 text-slate-900 disabled:opacity-60"
            >
              {busy && demo ? 'Opening local workspace…' : 'Start local setup'}
            </button>
            <button
              type="button"
              onClick={() => enterLocalDemo({ resetData: true })}
              disabled={busy}
              className="mt-2 text-xs text-slate-500 underline"
            >
              Reset sample data and start local setup
            </button>
          </div>
        </div>

        <button
          type="button"
          className="mt-5 text-xs text-slate-500 underline"
          onClick={() => {
            resetConfig();
            window.location.reload();
          }}
        >
          Change connection IDs
        </button>
      </div>
    </div>
  );
}

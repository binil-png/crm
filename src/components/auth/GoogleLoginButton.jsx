import { useEffect, useState } from 'react';
import { Database, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isDemoMode, refreshAppSheetsStatus, resetConfig } from '../../services/googleApi';

export default function GoogleLoginButton() {
  const { login, enterLocalDemo, busy, error } = useAuth();
  const [appSheets, setAppSheets] = useState({ enabled: false, shareWith: '' });
  const demo = isDemoMode();

  useEffect(() => {
    if (demo) return undefined;
    refreshAppSheetsStatus().then(setAppSheets).catch(() => {});
    return undefined;
  }, [demo]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold">Sheets CRM</h1>
        <p className="mt-2 text-sm text-slate-600">
          {demo
            ? 'Local test mode is on. Leads, users, training, and work logs stay in this browser’s localStorage. Google Sheets is not used.'
            : 'Continue with Google to use the live Sheets, or test the CRM in this browser with localStorage sample data.'}
        </p>
        {error ? <p className="mt-3 rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}
        {!demo ? (
          <p className="mt-3 text-xs text-slate-500">
            {appSheets.enabled
              ? `Live Sheets are opened by the CRM app. Share both workbooks once with ${appSheets.shareWith} as Editor.`
              : 'Live Google login writes to the Users sheet. That Gmail must be an Editor, unless a service account is configured.'}
          </p>
        ) : null}
        {demo ? (
          <button
            type="button"
            onClick={() => enterLocalDemo()}
            disabled={busy}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
          >
            <Database size={16} />
            {busy ? 'Opening local workspace…' : 'Enter local test workspace'}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={login}
              disabled={busy}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
            >
              <LogIn size={16} />
              {busy ? 'Signing in…' : 'Continue with Google'}
            </button>
            <button
              type="button"
              onClick={() => enterLocalDemo()}
              disabled={busy}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded border border-slate-300 px-4 py-2 text-slate-800 disabled:opacity-60"
            >
              <Database size={16} />
              Test with localStorage
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => enterLocalDemo({ resetData: true })}
          disabled={busy}
          className="mt-3 w-full text-xs text-slate-500 underline"
        >
          Reset sample data and start local test
        </button>
        <p className="mt-4 text-xs text-slate-500">
          {demo
            ? 'Demo user: Demo User (demo@example.com), Admin. Data key: crm_mock_db_v7.'
            : 'Google sign-in uses Sheets, Drive metadata, and Calendar. Local test does not.'}
        </p>
        <button
          type="button"
          className="mt-3 text-xs text-slate-500 underline"
          onClick={() => {
            resetConfig();
            window.location.reload();
          }}
        >
          Change Google connection
        </button>
      </div>
    </div>
  );
}

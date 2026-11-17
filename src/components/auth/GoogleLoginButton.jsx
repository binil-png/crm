import { useEffect, useState } from 'react';
import { LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isDemoMode, refreshAppSheetsStatus, resetConfig } from '../../services/googleApi';

export default function GoogleLoginButton() {
  const { login, busy, error } = useAuth();
  const [appSheets, setAppSheets] = useState({ enabled: false, shareWith: '' });

  useEffect(() => {
    refreshAppSheetsStatus().then(setAppSheets).catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold">Sheets CRM</h1>
        <p className="mt-2 text-sm text-slate-600">
          Continue with Google. Your Gmail name and email are written to the Users sheet, then you are marked Registered
          in this app. The CRM opens only after that save succeeds.
        </p>
        {error ? <p className="mt-3 rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}
        <p className="mt-3 text-xs text-slate-500">
          {appSheets.enabled
            ? `Sheets are opened by the CRM app. Share both workbooks once with ${appSheets.shareWith} as Editor. Individual Gmail accounts do not need sheet access.`
            : 'To allow every Google account without sharing the sheet with each person, add a service account JSON as GOOGLE_SERVICE_ACCOUNT_FILE in .env and share both sheets with that service account as Editor. Until then, share the sheets with the Gmail used to sign in.'}
        </p>
        <button
          type="button"
          onClick={login}
          disabled={busy}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
        >
          <LogIn size={16} />
          {busy
            ? 'Signing in and registering on the Users sheet…'
            : isDemoMode()
              ? 'Enter demo workspace'
              : 'Continue with Google'}
        </button>
        <p className="mt-4 text-xs text-slate-500">
          {appSheets.enabled
            ? 'Google sign-in identifies you. Calendar events still use your Google Calendar permission.'
            : 'Requested scopes: Google Sheets, Drive file metadata, and Calendar events.'}
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

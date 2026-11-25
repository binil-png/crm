import { useEffect, useState } from 'react';
import { CalendarDays, Database, Sheet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isDemoMode, refreshAppSheetsStatus, resetConfig } from '../../services/googleApi';
import { DEMO_ACCOUNTS } from '../../utils/constants';

export default function GoogleLoginButton() {
  const { login, enterLocalDemo, busy, error } = useAuth();
  const [appSheets, setAppSheets] = useState({ enabled: false, shareWith: '' });
  const demo = isDemoMode();

  useEffect(() => {
    refreshAppSheetsStatus().then(setAppSheets).catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-8">
        <h1 className="text-xl font-semibold">Sheets CRM</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in or try a local demo.</p>
        {error ? <p className="mt-4 rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="flex flex-col rounded-lg border border-slate-200 p-5">
            <div className="flex items-center gap-2 text-slate-900">
              <Sheet size={18} />
              <CalendarDays size={18} />
              <h2 className="font-semibold">Google</h2>
            </div>
            <p className="mt-3 flex-1 text-sm text-slate-600">Sheets and Calendar.</p>
            <p className="mt-2 text-xs text-slate-500">
              {appSheets.enabled
                ? `Share sheets with ${appSheets.shareWith}.`
                : 'Editor access is required on the sheets.'}
            </p>
            <button
              type="button"
              onClick={login}
              disabled={busy}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
            >
              {busy && !demo ? 'Connecting…' : 'Connect Google'}
            </button>
          </div>

          <div className="flex flex-col rounded-lg border border-slate-200 p-5">
            <div className="flex items-center gap-2 text-slate-900">
              <Database size={18} />
              <h2 className="font-semibold">Local</h2>
            </div>
            <p className="mt-3 flex-1 text-sm text-slate-600">Sample data in this browser.</p>
            <div className="mt-5 grid gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => enterLocalDemo({ account })}
                  disabled={busy}
                  className="rounded border border-slate-300 bg-white px-3 py-2 text-left disabled:opacity-60"
                >
                  <span className="block text-sm font-medium text-slate-900">
                    {busy && demo ? 'Opening local workspace…' : `Start as ${account.label}`}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {account.userType} · {account.userRole} · {account.email}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => enterLocalDemo({ resetData: true, account: DEMO_ACCOUNTS[0] })}
              disabled={busy}
              className="mt-2 text-xs text-slate-500 underline"
            >
              Reset demo
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
          Change IDs
        </button>
      </div>
    </div>
  );
}

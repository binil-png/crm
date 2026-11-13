import { LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isDemoMode, resetConfig } from '../../services/googleApi';

export default function GoogleLoginButton() {
  const { login, busy, error } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold">Sheets CRM</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in with Google to read and write the CRM spreadsheet and manage calendar sessions.
        </p>
        {error ? <p className="mt-3 rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}
        <button
          type="button"
          onClick={login}
          disabled={busy}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
        >
          <LogIn size={16} />
          {busy ? 'Connecting…' : isDemoMode() ? 'Enter demo workspace' : 'Continue with Google'}
        </button>
        <p className="mt-4 text-xs text-slate-500">
          Requested scopes: Google Sheets, Drive file metadata, and Calendar events.
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

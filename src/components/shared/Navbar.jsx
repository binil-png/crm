import { LogOut, RefreshCw, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCrmStore } from '../../store/crmStore';
import { DEMO_ACCOUNTS, ROLES, ROLE_LABELS } from '../../utils/constants';
import { isDemoMode } from '../../services/googleApi';
import useNow from '../../hooks/useNow';
import PushPrompt from './PushPrompt';

const formatSynced = (at, now) => {
  if (!at) return 'Waiting for first sync';
  const seconds = Math.max(0, Math.round((now.getTime() - at) / 1000));
  if (seconds < 10) return 'Live · just now';
  if (seconds < 60) return `Live · ${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return `Live · ${minutes}m ago`;
};

export default function Navbar() {
  const { user, role, userType, userRole, privileges, isRegistered, switchRole, logout, registration, enterLocalDemo } = useAuth();
  const { refreshAll, loading, syncing, lastSyncedAt } = useCrmStore();
  const now = useNow(10000);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      {registration?.email ? (
        <p className="border-b border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800">
          {isDemoMode()
            ? `Registered in localStorage test data: ${registration.username} (${registration.email})`
            : `Registered in the app and on the Users Google Sheet: ${registration.username} (${registration.email})`}
        </p>
      ) : null}
      <div className="flex w-full flex-wrap items-center justify-between gap-3 px-3 py-3">
        <div>
          <p className="text-sm font-semibold">Sheets CRM</p>
          <p className="text-xs text-slate-500">
            {isDemoMode() ? 'LocalStorage test mode · no Google Sheets' : 'Google Sheets + Calendar, no backend'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <p className="leading-tight text-slate-500">
              Team <span className="font-medium text-slate-800">{userType}</span>
            </p>
            <p className="leading-tight text-slate-500">
              Role <span className="font-medium text-slate-800">{userRole}</span>
            </p>
            {isRegistered ? (
              <p className="leading-tight text-slate-500">
                Account <span className="font-medium text-emerald-700">Registered</span>
              </p>
            ) : null}
            {isDemoMode() ? (
              <label className="leading-tight text-slate-500">
                User
                <select
                  className="ml-1 rounded border border-slate-200 bg-white px-2 py-1 font-medium text-slate-800"
                  value={user?.email || DEMO_ACCOUNTS[0].email}
                  onChange={(event) => {
                    const account = DEMO_ACCOUNTS.find((item) => item.email === event.target.value);
                    if (account) enterLocalDemo({ account });
                  }}
                >
                  {DEMO_ACCOUNTS.map((account) => (
                    <option key={account.email} value={account.email}>
                      {account.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {privileges.canSwitchModule ? (
              <div className="flex rounded border border-slate-200 p-1">
                {Object.values(ROLES).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => switchRole(value)}
                    className={`rounded px-2 py-1 ${role === value ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
                  >
                    {ROLE_LABELS[value]}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <PushPrompt />
            <p className="hidden text-xs text-slate-500 sm:block">
              {syncing && !loading ? 'Updating…' : formatSynced(lastSyncedAt, now)}
            </p>
            <button
              type="button"
              onClick={() => refreshAll({ force: true }).catch(() => {})}
              className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs"
            >
              <RefreshCw size={14} className={loading || syncing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm">
            {user?.picture ? (
              <img src={user.picture} alt="" className="h-8 w-8 rounded-full" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                <UserRound size={16} />
              </span>
            )}
            <div className="leading-tight">
              <p className="font-medium">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-500">
                {user?.email}
                {isDemoMode() ? ' · demo mode' : ''}
              </p>
            </div>
          </div>

          <button type="button" onClick={logout} className="inline-flex items-center gap-1 text-sm text-slate-600">
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

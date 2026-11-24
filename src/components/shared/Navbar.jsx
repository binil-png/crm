import { LogOut, RefreshCw, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCrmStore } from '../../store/crmStore';
import { ROLES, ROLE_LABELS } from '../../utils/constants';
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
  const { user, role, userType, userRole, privileges, isRegistered, switchRole, logout, registration } = useAuth();
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
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-5">Sheets CRM</p>
            <p className="text-xs leading-4 text-slate-500">
              {isDemoMode() ? 'LocalStorage test mode · no Google Sheets' : 'Google Sheets + Calendar, no backend'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <PushPrompt />
            <p className="hidden text-xs text-slate-500 sm:block">
              {syncing && !loading ? 'Updating…' : formatSynced(lastSyncedAt, now)}
            </p>
            <button
              type="button"
              onClick={() => refreshAll({ force: true }).catch(() => {})}
              className="inline-flex h-7 items-center gap-1 rounded border border-slate-200 px-2 text-xs"
            >
              <RefreshCw size={14} className={loading || syncing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <div className="flex items-center gap-2 text-sm">
              {user?.picture ? (
                <img src={user.picture} alt="" className="h-8 w-8 rounded-full" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                  <UserRound size={16} />
                </span>
              )}
              <div className="leading-4">
                <p className="font-medium">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-500">
                  {user?.email}
                  {isDemoMode() ? ' · demo mode' : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="inline-flex h-7 items-center gap-1 text-sm text-slate-600"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <p className="inline-flex h-7 items-center text-slate-500">
            Team <span className="ml-1 font-medium text-slate-800">{userType}</span>
          </p>
          <p className="inline-flex h-7 items-center text-slate-500">
            Role <span className="ml-1 font-medium text-slate-800">{userRole}</span>
          </p>
          {isRegistered ? (
            <p className="inline-flex h-7 items-center text-slate-500">
              Account <span className="ml-1 font-medium text-emerald-700">Registered</span>
            </p>
          ) : null}
          {privileges.canSwitchModule || privileges.canViewConfigSection ? (
            <div className="inline-flex flex-wrap items-center gap-2">
              <div className="inline-flex h-7 items-center rounded border border-slate-200 p-0.5">
                {(privileges.canSwitchModule
                  ? [ROLES.SALES, ROLES.TRAINING]
                  : [privileges.workspace]
                ).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => switchRole(value)}
                    className={`h-6 rounded px-2 text-xs ${
                      role === value ? 'bg-slate-900 text-white' : 'text-slate-600'
                    }`}
                  >
                    {ROLE_LABELS[value]}
                  </button>
                ))}
              </div>
              {privileges.canViewConfigSection ? (
                <div className="inline-flex h-7 items-center rounded border border-slate-200 p-0.5">
                  <button
                    type="button"
                    onClick={() => switchRole(ROLES.CONFIG)}
                    className={`h-6 rounded px-2 text-xs ${
                      role === ROLES.CONFIG ? 'bg-slate-900 text-white' : 'text-slate-600'
                    }`}
                  >
                    {ROLE_LABELS[ROLES.CONFIG]}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

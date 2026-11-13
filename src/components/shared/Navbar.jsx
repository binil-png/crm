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
  const { user, role, userType, userRole, isAdmin, switchRole, logout } = useAuth();
  const { refreshAll, loading, syncing, lastSyncedAt } = useCrmStore();
  const now = useNow(10000);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="flex w-full flex-wrap items-center justify-between gap-3 px-3 py-3">
        <div>
          <p className="text-sm font-semibold">Sheets CRM</p>
          <p className="text-xs text-slate-500">Google Sheets + Calendar, no backend</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded bg-slate-100 px-2 py-1 font-medium text-slate-700">{userType}</span>
            <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">{userRole}</span>
            {isAdmin ? (
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

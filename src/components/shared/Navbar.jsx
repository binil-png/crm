import { useEffect, useRef } from 'react';
import { LogOut, RefreshCw, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCrmStore } from '../../store/crmStore';
import { ROLES, ROLE_LABELS } from '../../utils/constants';
import { isDemoMode } from '../../services/googleApi';
import useNow from '../../hooks/useNow';
import NotificationBell from './NotificationBell';
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
  const headerRef = useRef(null);

  useEffect(() => {
    const node = headerRef.current;
    if (!node) return undefined;
    const apply = () => {
      document.documentElement.style.setProperty('--crm-header-h', `${Math.round(node.getBoundingClientRect().height)}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--crm-header-h');
    };
  }, [registration?.email, userType, userRole, role]);

  return (
    <header ref={headerRef} className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Sheets CRM</p>
            <p className="text-xs text-slate-500">{isDemoMode() ? 'Demo' : 'Live'}</p>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <NotificationBell />
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
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
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

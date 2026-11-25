import { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useCrmStore } from './store/crmStore';
import { ROLES } from './utils/constants';
import useNetworkPoll from './hooks/useNetworkPoll';
import GoogleLoginButton from './components/auth/GoogleLoginButton';
import Navbar from './components/shared/Navbar';
import CommunicationPanel from './components/shared/CommunicationPanel';
import LeadKanban from './components/sales/LeadKanban';
import ClientList from './components/training/ClientList';
import TrainingCalendar from './components/training/TrainingCalendar';
import SessionList from './components/training/SessionList';
import WorkLogForm from './components/worklog/WorkLogForm';
import UsersPanel from './components/admin/UsersPanel';
import SheetsConfigPanel from './components/admin/SheetsConfigPanel';
import SalesTrainingProgress from './components/sales/SalesTrainingProgress';

export default function App() {
  const { isAuthenticated, booting, role, privileges, error } = useAuth();
  const { refreshAll, error: dataError, loading } = useCrmStore();
  const [tab, setTab] = useState('main');

  useEffect(() => {
    if (isAuthenticated) {
      refreshAll().catch(() => {});
    }
  }, [isAuthenticated, refreshAll]);

  useNetworkPoll(isAuthenticated);

  useEffect(() => {
    if (role === ROLES.CONFIG) {
      setTab(privileges.canViewUsers ? 'users' : 'sheets');
      return;
    }
    setTab('main');
  }, [role, privileges.canViewUsers]);

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600">
        Loading CRM…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <GoogleLoginButton />;
  }

  const salesTabs = [
    { id: 'main', label: 'Leads' },
    { id: 'training-progress', label: 'Training progress' },
    { id: 'messages', label: 'Interaction History' },
  ];
  const trainingTabs = [
    { id: 'main', label: 'Calendar' },
    { id: 'clients', label: 'Passed clients' },
    { id: 'sessions', label: 'Sessions' },
    { id: 'worklog', label: 'Work log / Leave' },
    { id: 'messages', label: 'Interaction History' },
  ];
  const configTabs = [
    ...(privileges.canViewUsers ? [{ id: 'users', label: 'Users' }] : []),
    ...(privileges.canManageSheets ? [{ id: 'sheets', label: 'Google sheets' }] : []),
    ...(privileges.admin ? [{ id: 'worklog', label: 'Work log / Leave' }] : []),
  ];
  const tabs =
    role === ROLES.CONFIG ? configTabs : role === ROLES.SALES ? salesTabs : trainingTabs;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="w-full min-w-0 max-w-full overflow-x-hidden px-3 py-4">
        {error || dataError ? (
          <p className="mb-4 rounded bg-rose-50 p-3 text-sm text-rose-700">{error || dataError}</p>
        ) : null}

        <div className="mb-5 flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded px-3 py-1.5 text-sm ${tab === item.id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200'}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {role === ROLES.CONFIG ? (
          <div className="mb-4">
            <h1 className="text-lg font-semibold">Configuration</h1>
            <p className="text-sm text-slate-500">
              User management, Google sheet accounts, and admin work-log review live here, not in Sales or
              Technical support.
            </p>
          </div>
        ) : null}

        {loading ? <p className="mb-4 text-sm text-slate-500">Syncing Google data…</p> : null}

        {role === ROLES.SALES && tab === 'main' ? <LeadKanban /> : null}
        {role === ROLES.SALES && tab === 'training-progress' ? <SalesTrainingProgress /> : null}
        {role === ROLES.TRAINING && tab === 'main' ? <TrainingCalendar /> : null}
        {role === ROLES.TRAINING && tab === 'clients' ? <ClientList /> : null}
        {role === ROLES.TRAINING && tab === 'sessions' ? (
          <section>
            <h2 className="mb-3 text-lg font-semibold">Training and doubt clarification sessions</h2>
            <SessionList />
          </section>
        ) : null}
        {role === ROLES.TRAINING && tab === 'worklog' ? <WorkLogForm /> : null}
        {tab === 'messages' ? <CommunicationPanel /> : null}
        {role === ROLES.CONFIG && privileges.canViewUsers && tab === 'users' ? <UsersPanel /> : null}
        {role === ROLES.CONFIG && privileges.canManageSheets && tab === 'sheets' ? <SheetsConfigPanel /> : null}
        {role === ROLES.CONFIG && privileges.admin && tab === 'worklog' ? <WorkLogForm /> : null}
      </main>
    </div>
  );
}

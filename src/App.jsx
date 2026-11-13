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

export default function App() {
  const { isAuthenticated, booting, role, isAdmin, error } = useAuth();
  const { refreshAll, error: dataError, loading } = useCrmStore();
  const [tab, setTab] = useState('main');

  useEffect(() => {
    if (isAuthenticated) {
      refreshAll().catch(() => {});
    }
  }, [isAuthenticated, refreshAll]);

  useNetworkPoll(isAuthenticated);

  useEffect(() => {
    setTab('main');
  }, [role]);

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
    { id: 'messages', label: 'Interaction History' },
  ];
  const trainingTabs = [
    { id: 'main', label: 'Calendar' },
    { id: 'clients', label: 'Passed clients' },
    { id: 'sessions', label: 'Sessions' },
    { id: 'worklog', label: 'Work log / Leave' },
    { id: 'messages', label: 'Interaction History' },
  ];
  const tabs = [
    ...(role === ROLES.SALES ? salesTabs : trainingTabs),
    ...(isAdmin ? [{ id: 'users', label: 'Users' }] : []),
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="w-full px-3 py-4">
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

        {loading ? <p className="mb-4 text-sm text-slate-500">Syncing Google data…</p> : null}

        {role === ROLES.SALES && tab === 'main' ? <LeadKanban /> : null}
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
        {isAdmin && tab === 'users' ? <UsersPanel /> : null}
      </main>
    </div>
  );
}

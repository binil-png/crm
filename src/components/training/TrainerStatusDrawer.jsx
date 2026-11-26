import { useState } from 'react';
import { PanelRight } from 'lucide-react';
import Drawer from '../shared/Drawer';
import TrainerStatusBoard from './TrainerStatusBoard';

export default function TrainerStatusDrawer({
  team = [],
  clients = [],
  sessions = [],
  currentEmail = '',
  selectedEmail,
  onSelect,
}) {
  const [open, setOpen] = useState(false);
  const unassignedCount = clients.filter((client) => !String(client.Assigned_Trainer || '').trim()).length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800"
      >
        <PanelRight size={16} />
        Trainers
        {unassignedCount ? (
          <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-medium text-amber-800">{unassignedCount}</span>
        ) : null}
      </button>
      <Drawer
        title="Trainers"
        open={open}
        onClose={() => setOpen(false)}
        onOpen={() => setOpen(true)}
        edgeLabel="Trainers"
        edgeBadge={unassignedCount}
      >
        <TrainerStatusBoard
          team={team}
          clients={clients}
          sessions={sessions}
          currentEmail={currentEmail}
          selectedEmail={selectedEmail}
          onSelect={onSelect}
        />
      </Drawer>
    </>
  );
}

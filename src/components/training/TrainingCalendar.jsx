import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCrmStore } from '../../store/crmStore';
import { listTrainingTeam, parseSheetDate, sessionColor, trainingColor } from '../../utils/constants';
import TrainerSelect from './TrainerSelect';

const START_HOUR = 8;
const END_HOUR = 20;
const SLOT_MINUTES = 30;
const ROW_HEIGHT = 28;
const DAY_COUNT = 7;
const DURATIONS = [30, 60, 90];

const startOfWeek = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const weekday = date.getDay();
  date.setDate(date.getDate() + (weekday === 0 ? -6 : 1 - weekday));
  return date;
};

const addDays = (value, days) => {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
};

const sameDate = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const slotCount = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES;

const slots = Array.from({ length: slotCount }, (_, index) => {
  const minutes = START_HOUR * 60 + index * SLOT_MINUTES;
  return { hour: Math.floor(minutes / 60), minute: minutes % 60, index };
});

const atSlot = (day, hour, minute) => {
  const date = new Date(day);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const minutesFromStart = (date) => date.getHours() * 60 + date.getMinutes() - START_HOUR * 60;

const formatClock = (hour, minute) =>
  `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

const readDragPayload = (event) => {
  try {
    return JSON.parse(event.dataTransfer.getData('text/plain') || '{}');
  } catch {
    return {};
  }
};

export default function TrainingCalendar() {
  const { user } = useAuth();
  const { clients, sessions, scheduleSessions, rescheduleSession } = useCrmStore();
  const team = useMemo(
    () => listTrainingTeam({ clients, sessions, extra: [user?.email] }),
    [clients, sessions, user?.email]
  );
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [duration, setDuration] = useState(60);
  const [trainerEmail, setTrainerEmail] = useState(user?.email || team[0]?.email || '');
  const [selectedId, setSelectedId] = useState('');
  const [hoverKey, setHoverKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [activeSession, setActiveSession] = useState(null);

  const days = useMemo(() => Array.from({ length: DAY_COUNT }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const queue = clients.filter((client) => client.Training_Status !== 'Completed');
  const selected = clients.find((client) => client.Client_ID === selectedId) || null;

  const visibleSessions = sessions.filter((session) => {
    if (session.Status === 'Cancelled') return false;
    const start = parseSheetDate(session.Start_Time);
    if (!start) return false;
    const weekEnd = addDays(weekStart, DAY_COUNT);
    return start >= weekStart && start < weekEnd;
  });

  const placeAt = async (day, hour, minute, payload) => {
    const start = atSlot(day, hour, minute);
    const end = new Date(start.getTime() + duration * 60 * 1000);
    setBusy(true);
    setError('');
    try {
      if (payload?.kind === 'session') {
        const session = sessions.find((item) => item.Session_ID === payload.id);
        if (!session || session.Status === 'Completed' || session.Status === 'Cancelled') return;
        const previousStart = parseSheetDate(session.Start_Time);
        const previousEnd = parseSheetDate(session.End_Time);
        const span = previousStart && previousEnd ? previousEnd.getTime() - previousStart.getTime() : duration * 60 * 1000;
        await rescheduleSession(session, start, new Date(start.getTime() + Math.max(SLOT_MINUTES * 60 * 1000, span)));
        setActiveSession(null);
        return;
      }

      const clientId = payload?.id || selectedId;
      const client = clients.find((item) => item.Client_ID === clientId) || selected;
      if (!client) {
        setError('Select a client first, or drag one onto a time slot.');
        return;
      }

      const trainer = trainerEmail || user?.email || client.Assigned_Trainer || '';
      if (!trainer) {
        setError('Select a training team member before scheduling.');
        return;
      }
      await scheduleSessions({
        client,
        trainerEmail: trainer,
        sessions: [
          {
            title: `Training · ${client.Client_Name}`,
            start,
            end,
          },
        ],
      });
      setSelectedId('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const weekLabel = `${days[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Training calendar</h2>
          <p className="text-sm text-slate-500">
            Drag a client onto a slot, or select a client and click a time. Sessions are booked for the selected trainer.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded border border-slate-300 bg-white px-2 py-1.5"
            onClick={() => setWeekStart((value) => addDays(value, -7))}
            aria-label="Previous week"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
          >
            Today
          </button>
          <button
            type="button"
            className="rounded border border-slate-300 bg-white px-2 py-1.5"
            onClick={() => setWeekStart((value) => addDays(value, 7))}
            aria-label="Next week"
          >
            <ChevronRight size={16} />
          </button>
          <p className="min-w-[180px] text-sm font-medium">{weekLabel}</p>
          <div className="min-w-[220px]">
            <TrainerSelect compact value={trainerEmail} onChange={setTrainerEmail} team={team} />
          </div>
          <label className="text-sm text-slate-600">
            Duration
            <select
              className="ml-2 rounded border border-slate-300 bg-white px-2 py-1.5"
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
            >
              {DURATIONS.map((item) => (
                <option key={item} value={item}>
                  {item} min
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error ? <p className="rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}
      {busy ? <p className="text-sm text-slate-500">Updating calendar…</p> : null}

      <div className="grid items-start gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-slate-200 bg-white p-3 lg:sticky lg:top-16">
          <p className="text-sm font-medium">Clients to schedule</p>
          <p className="mb-3 text-xs text-slate-500">Drag onto the week, or click to select.</p>
          <div className="max-h-[420px] space-y-2 overflow-auto lg:max-h-[70vh]">
            {queue.length === 0 ? (
              <p className="rounded border border-dashed border-slate-300 p-3 text-sm text-slate-500">
                No open clients. Sales can pass a closed account to this queue.
              </p>
            ) : null}
            {queue.map((client) => (
              <ClientChip
                key={client.Client_ID}
                client={client}
                selected={selectedId === client.Client_ID}
                sessionCount={sessions.filter((session) => session.Client_ID === client.Client_ID && session.Status !== 'Cancelled').length}
                onSelect={() => setSelectedId((id) => (id === client.Client_ID ? '' : client.Client_ID))}
              />
            ))}
          </div>
        </aside>

        <div className="overflow-auto rounded-lg border border-slate-300 bg-white">
          <div className="grid min-w-[900px]" style={{ gridTemplateColumns: `72px repeat(${DAY_COUNT}, minmax(0, 1fr))` }}>
            <div className="sticky top-0 z-10 border-b border-slate-300 bg-slate-50" />
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={`sticky top-0 z-10 border-b border-l border-slate-300 bg-slate-50 px-2 py-2 text-center text-xs ${
                  sameDate(day, today) ? 'font-semibold text-sky-800' : 'text-slate-600'
                }`}
              >
                <p className="uppercase">{day.toLocaleDateString(undefined, { weekday: 'short' })}</p>
                <p className="text-sm">{day.getDate()}</p>
              </div>
            ))}

            <div>
              {slots.map((slot) => (
                <div
                  key={`label-${slot.index}`}
                  className="border-t border-slate-200 px-2 text-[11px] text-slate-400"
                  style={{ height: ROW_HEIGHT }}
                >
                  {slot.minute === 0 ? formatClock(slot.hour, slot.minute) : ''}
                </div>
              ))}
            </div>

            {days.map((day) => (
              <DayColumn
                key={day.toISOString()}
                day={day}
                isToday={sameDate(day, today)}
                hoverKey={hoverKey}
                selected={Boolean(selected)}
                sessions={visibleSessions.filter((session) => {
                  const start = parseSheetDate(session.Start_Time);
                  return start && sameDate(start, day);
                })}
                clients={clients}
                onHover={setHoverKey}
                onPlace={(hour, minute, payload) => placeAt(day, hour, minute, payload)}
                onSelectSession={setActiveSession}
              />
            ))}
          </div>
        </div>
      </div>

      {activeSession ? (
        <SessionPopover
          session={activeSession}
          client={clients.find((client) => client.Client_ID === activeSession.Client_ID)}
          onClose={() => setActiveSession(null)}
        />
      ) : null}
    </section>
  );
}

function ClientChip({ client, selected, sessionCount, onSelect }) {
  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'client', id: client.Client_ID }));
        event.dataTransfer.effectAllowed = 'copy';
      }}
      className={`flex w-full cursor-grab items-start gap-2 rounded-lg border px-2 py-2 text-left active:cursor-grabbing ${
        selected ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
      }`}
    >
      <GripVertical size={14} className="mt-1 shrink-0 text-slate-400" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{client.Client_Name}</span>
        <span className="block truncate text-xs text-slate-500">{client.Contact_Email || 'No email'}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1">
          <span className={`rounded px-1.5 py-0.5 text-[10px] ${trainingColor(client.Training_Status)}`}>
            {client.Training_Status || 'Pending Assignment'}
          </span>
          <span className="text-[10px] text-slate-400">{sessionCount === 1 ? '1 session' : `${sessionCount} sessions`}</span>
        </span>
      </span>
    </div>
  );
}

function slotFromPointer(event, column) {
  const rect = column.getBoundingClientRect();
  const index = Math.max(0, Math.min(slotCount - 1, Math.floor((event.clientY - rect.top) / ROW_HEIGHT)));
  return slots[index];
}

function DayColumn({ day, isToday, hoverKey, selected, sessions, clients, onHover, onPlace, onSelectSession }) {
  const dropOnColumn = (event) => {
    event.preventDefault();
    const slot = slotFromPointer(event, event.currentTarget);
    onHover('');
    onPlace(slot.hour, slot.minute, readDragPayload(event));
  };

  return (
    <div
      className={`relative border-l border-slate-200 ${isToday ? 'bg-sky-50/40' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        const slot = slotFromPointer(event, event.currentTarget);
        onHover(`${day.toDateString()}-${slot.hour}-${slot.minute}`);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onHover('');
      }}
      onDrop={dropOnColumn}
    >
      {slots.map((slot) => {
        const key = `${day.toDateString()}-${slot.hour}-${slot.minute}`;
        return (
          <div
            key={key}
            className={`border-t border-slate-100 ${hoverKey === key ? 'bg-sky-100' : selected ? 'hover:bg-sky-50' : 'hover:bg-slate-50'}`}
            style={{ height: ROW_HEIGHT }}
            onClick={() => {
              if (selected) onPlace(slot.hour, slot.minute, { kind: 'client' });
            }}
          />
        );
      })}

      {sessions.map((session) => {
        const start = parseSheetDate(session.Start_Time);
        const end = parseSheetDate(session.End_Time);
        if (!start || !end) return null;
        const top = (minutesFromStart(start) / SLOT_MINUTES) * ROW_HEIGHT;
        const height = Math.max(ROW_HEIGHT - 4, ((end.getTime() - start.getTime()) / 60000 / SLOT_MINUTES) * ROW_HEIGHT - 4);
        const client = clients.find((item) => item.Client_ID === session.Client_ID);
        const movable = session.Status !== 'Completed';
        return (
          <button
            key={session.Session_ID}
            type="button"
            draggable={movable}
            onClick={(event) => {
              event.stopPropagation();
              onSelectSession(session);
            }}
            onDragStart={(event) => {
              event.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'session', id: session.Session_ID }));
              event.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const column = event.currentTarget.parentElement;
              const slot = slotFromPointer(event, column);
              onHover('');
              onPlace(slot.hour, slot.minute, readDragPayload(event));
            }}
            className={`absolute right-1 left-1 z-10 overflow-hidden rounded px-1.5 py-0.5 text-left text-[11px] shadow-sm ${sessionColor(session.Status)}`}
            style={{ top: top + 2, height }}
            title={`${client?.Client_Name || session.Session_Title} · ${formatClock(start.getHours(), start.getMinutes())}`}
          >
            <span className="block truncate font-medium">{client?.Client_Name || session.Session_Title}</span>
            <span className="block truncate opacity-80">
              {formatClock(start.getHours(), start.getMinutes())}–{formatClock(end.getHours(), end.getMinutes())}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SessionPopover({ session, client, onClose }) {
  const { completeSession, updateSession } = useCrmStore();
  const start = parseSheetDate(session.Start_Time);
  const end = parseSheetDate(session.End_Time);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/20 p-4 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">{client?.Client_Name || session.Session_Title}</p>
            <p className="text-sm text-slate-500">{session.Session_Title}</p>
          </div>
          <button type="button" className="text-slate-500" onClick={onClose}>
            ✕
          </button>
        </div>
        <p className="text-sm">
          {start ? start.toLocaleString() : '—'} → {end ? end.toLocaleTimeString() : '—'}
        </p>
        <p className="text-sm text-slate-500">{session.Trainer_Email}</p>
        <p className="mt-2">
          <span className={`rounded px-2 py-0.5 text-xs ${sessionColor(session.Status)}`}>{session.Status}</span>
        </p>
        {session.Status !== 'Completed' && session.Status !== 'Cancelled' ? (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="rounded bg-emerald-700 px-3 py-2 text-sm text-white"
              onClick={async () => {
                await completeSession(session);
                onClose();
              }}
            >
              Mark complete
            </button>
            <button
              type="button"
              className="rounded border border-slate-300 px-3 py-2 text-sm"
              onClick={async () => {
                await updateSession(session.Session_ID, { Status: 'Cancelled' });
                onClose();
              }}
            >
              Cancel session
            </button>
          </div>
        ) : null}
        <p className="mt-3 text-xs text-slate-400">Drag this block to another slot to reschedule.</p>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCrmStore } from '../../store/crmStore';
import {
  TRAINING_STATUSES,
  WORK_TYPES,
  clientLeadEmail,
  clientWorkType,
  formatDdMmYyyy,
  isCancelledSession,
  isValidLeadEmail,
  listTrainingTeam,
  normalizeCalendarId,
  normalizeTrainingStatus,
  parseSheetDate,
  sameEmail,
  sessionCancelReason,
  sessionTitleForType,
  sessionWorkType,
  sessionColor,
  trainingColor,
  workTypeColor,
} from '../../utils/constants';
import LeadEmailField from './LeadEmailField';
import TrainerSelect, { ALL_TRAINERS } from './TrainerSelect';
import TrainerStatusBoard from './TrainerStatusBoard';
import WorkTypeSelect from './WorkTypeSelect';

const START_HOUR = 8;
const END_HOUR = 20;
const SLOT_MINUTES = 30;
const ROW_HEIGHT = 28;
const DAY_COUNT = 7;
const DURATIONS = [30, 60, 90];
const VISIBLE_HOURS = 8;
const DAY_HEADER_PX = 44;
const MIN_CALENDAR_PX = VISIBLE_HOURS * (60 / SLOT_MINUTES) * ROW_HEIGHT + DAY_HEADER_PX;

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

const formatClock = (hour, minute) => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  const displayMinute = String(minute).padStart(2, '0');
  return `${displayHour}:${displayMinute} ${period}`;
};

const formatClockLabel = (hour, minute) => {
  if (minute !== 0) return '';
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour} ${period}`;
};

const addClockMinutes = (hour, minute, extra) => {
  const total = hour * 60 + minute + extra;
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  return { hour: Math.floor(wrapped / 60), minute: wrapped % 60 };
};

const formatClockRange = (hour, minute, minutes) => {
  const end = addClockMinutes(hour, minute, minutes);
  return `${formatClock(hour, minute)} – ${formatClock(end.hour, end.minute)}`;
};

const DRAG_THRESHOLD_PX = 6;

const slotFromPointer = (event, column) => {
  const rect = column.getBoundingClientRect();
  const index = Math.max(0, Math.min(slotCount - 1, Math.floor((event.clientY - rect.top) / ROW_HEIGHT)));
  return slots[index];
};

const isMovableSession = (session) => {
  const status = String(session?.Status || '').trim().toLowerCase();
  return status !== 'completed' && status !== 'cancelled';
};

const slotFromClientPoint = (clientX, clientY, calendarEl) => {
  if (!calendarEl || (!clientX && !clientY)) return null;
  const columns = calendarEl.querySelectorAll('[data-day-column]');
  for (const column of columns) {
    const rect = column.getBoundingClientRect();
    if (clientX < rect.left || clientX >= rect.right) continue;
    const clampedY = Math.min(Math.max(clientY, rect.top), rect.bottom - 1);
    const slot = slotFromPointer({ clientY: clampedY }, column);
    return {
      dayKey: column.getAttribute('data-day-column'),
      dayIndex: Number(column.getAttribute('data-day-index')),
      hour: slot.hour,
      minute: slot.minute,
    };
  }
  return null;
};

const scrollCalendarTowardPointer = (scroller, clientY) => {
  if (!scroller) return;
  const rect = scroller.getBoundingClientRect();
  if (clientY < rect.top + 36) scroller.scrollTop -= 20;
  else if (clientY > rect.bottom - 36) scroller.scrollTop += 20;
};

const emptyDragImage = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas;
};

const readDragPayload = (event) => {
  try {
    const raw =
      event.dataTransfer.getData('application/json') || event.dataTransfer.getData('text/plain') || '{}';
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
};

const payloadFromDrop = (event, fallback) => {
  const fromEvent = readDragPayload(event);
  if (fromEvent?.kind || fromEvent?.id) return fromEvent;
  return fallback || {};
};

const writeDragPayload = (event, payload, effect = 'copy') => {
  const raw = JSON.stringify(payload);
  event.dataTransfer.effectAllowed = effect;
  event.dataTransfer.setData('text/plain', raw);
  try {
    event.dataTransfer.setData('application/json', raw);
  } catch {
    // Some browsers only allow text/plain during dragstart.
  }
};

export default function TrainingCalendar() {
  const { user, privileges, applyDirectory } = useAuth();
  const { clients, leads, sessions, users, scheduleSessions, rescheduleSession, updateDirectoryUser } = useCrmStore();
  const team = useMemo(
    () => listTrainingTeam({ clients, sessions, users, extra: [user?.email], currentEmail: user?.email }),
    [clients, sessions, users, user?.email]
  );
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [duration, setDuration] = useState(60);
  const [viewEmail, setViewEmail] = useState(
    () => (privileges.defaultTrainerScope === 'self' && user?.email ? user.email : ALL_TRAINERS)
  );
  const [workType, setWorkType] = useState('Training');
  const [typeFilter, setTypeFilter] = useState('All');
  const [selectedId, setSelectedId] = useState('');
  const [hoverSlot, setHoverSlot] = useState(null);
  const [dragItem, setDragItem] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [activeSession, setActiveSession] = useState(null);

  const previewRef = useRef(null);
  const previewPos = useRef({ x: 0, y: 0 });
  const dragPayloadRef = useRef(null);
  const calendarRef = useRef(null);
  const pointerDragRef = useRef(null);
  const suppressClickRef = useRef(false);
  const hoverSlotRef = useRef(null);
  const dropHandledRef = useRef(false);
  const dragSeqRef = useRef(0);
  const daysRef = useRef([]);
  const placeAtRef = useRef(async () => {});
  const dropAtPointRef = useRef(() => {});
  const endDragRef = useRef(() => {});
  const updateHoverSlotRef = useRef(() => {});

  const hoverKey = hoverSlot ? `${hoverSlot.dayKey}-${hoverSlot.hour}-${hoverSlot.minute}` : '';

  const movePreview = (x, y) => {
    if (!x && !y) return;
    previewPos.current = { x, y };
    if (!previewRef.current) return;
    previewRef.current.style.transform = `translate(${x + 14}px, ${y + 14}px)`;
  };

  const beginDrag = (event, item) => {
    try {
      const image = emptyDragImage();
      image.style.position = 'absolute';
      image.style.top = '-1000px';
      document.body.appendChild(image);
      event.dataTransfer.setDragImage(image, 0, 0);
      requestAnimationFrame(() => image.remove());
    } catch {
      // Keep the native ghost if the browser rejects a custom drag image.
    }
    previewPos.current = { x: event.clientX, y: event.clientY };
    dropHandledRef.current = false;
    dragPayloadRef.current = item;
    hoverSlotRef.current = null;
    const seq = ++dragSeqRef.current;
    requestAnimationFrame(() => {
      if (dragSeqRef.current === seq) setDragItem(item);
    });
  };

  const startPointerDrag = (event, item) => {
    if (event.button !== 0) return;
    dropHandledRef.current = false;
    suppressClickRef.current = false;
    pointerDragRef.current = {
      item,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      target: event.currentTarget,
      active: false,
    };
  };

  const updateHoverSlot = (next) => {
    hoverSlotRef.current = next || null;
    setHoverSlot((prev) => {
      if (!next) return null;
      if (prev && prev.dayKey === next.dayKey && prev.hour === next.hour && prev.minute === next.minute) return prev;
      return next;
    });
  };

  const endDrag = () => {
    dragSeqRef.current += 1;
    pointerDragRef.current = null;
    dragPayloadRef.current = null;
    hoverSlotRef.current = null;
    setDragItem(null);
    setHoverSlot(null);
  };

  const resolveDropSlot = (clientX, clientY) => {
    const found = slotFromClientPoint(clientX, clientY, calendarRef.current);
    if (found) return found;
    const hovered = hoverSlotRef.current;
    if (!hovered) return null;
    return {
      dayKey: hovered.dayKey,
      dayIndex: daysRef.current.findIndex((item) => item.toDateString() === hovered.dayKey),
      hour: hovered.hour,
      minute: hovered.minute,
    };
  };

  const dropAtPoint = (clientX, clientY, payload) => {
    if (dropHandledRef.current || !payload) return;
    dropHandledRef.current = true;
    const found = resolveDropSlot(clientX, clientY);
    endDrag();
    if (!found) return;
    const day =
      Number.isInteger(found.dayIndex) && found.dayIndex >= 0
        ? daysRef.current[found.dayIndex]
        : daysRef.current.find((entry) => entry.toDateString() === found.dayKey);
    if (day) placeAtRef.current(day, found.hour, found.minute, payload);
  };

  const days = useMemo(() => Array.from({ length: DAY_COUNT }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const queue = clients.filter((client) => {
    if (normalizeTrainingStatus(client.Training_Status) === 'Completed') return false;
    if (typeFilter !== 'All' && clientWorkType(client) !== typeFilter) return false;
    return true;
  });
  const selected = clients.find((client) => client.Client_ID === selectedId) || null;

  const viewTrainer = team.find((member) => sameEmail(member.email, viewEmail));
  const canEditTrainerCalendar = (email) => {
    if (!email || email === ALL_TRAINERS) return false;
    if (privileges.canManageUsers) return true;
    if (privileges.canEditOwnCalendar && sameEmail(email, user?.email)) return true;
    return Boolean(privileges.canEditTeamCalendar && privileges.canViewTraining);
  };

  const saveTrainerCalendarId = async (email, calendarId) => {
    setError('');
    setBusy(true);
    try {
      const next = await updateDirectoryUser(email, {
        'Calendar ID': normalizeCalendarId(calendarId, email),
      });
      if (sameEmail(email, user?.email)) applyDirectory(next);
    } catch (err) {
      setError(err.message || 'Could not save the training calendar ID.');
    } finally {
      setBusy(false);
    }
  };
  const visibleSessions = sessions.filter((session) => {
    if (viewEmail && viewEmail !== ALL_TRAINERS && !sameEmail(session.Trainer_Email, viewEmail)) {
      return false;
    }
    if (typeFilter !== 'All' && sessionWorkType(session) !== typeFilter) return false;
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
        if (!session || !isMovableSession(session)) return;
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

      const trainer = user?.email || '';
      if (!trainer) {
        setError('Sign in with a training account before scheduling.');
        return;
      }
      const sessionType =
        payload?.workType || (typeFilter !== 'All' ? workType : clientWorkType(client)) || 'Training';
      await scheduleSessions({
        client,
        trainerEmail: trainer,
        workType: sessionType,
        sessions: [
          {
            title: sessionTitleForType(sessionType, client.Client_Name),
            start,
            end,
            sessionType,
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

  daysRef.current = days;
  placeAtRef.current = placeAt;
  dropAtPointRef.current = dropAtPoint;
  endDragRef.current = endDrag;
  updateHoverSlotRef.current = updateHoverSlot;

  useEffect(() => {
    if (!dragItem) return undefined;
    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
    };
  }, [dragItem]);

  useEffect(() => {
    const hoverFromPoint = (clientX, clientY) => {
      const found = slotFromClientPoint(clientX, clientY, calendarRef.current);
      if (!found) {
        updateHoverSlotRef.current(null);
        return;
      }
      const day =
        Number.isInteger(found.dayIndex) && found.dayIndex >= 0
          ? daysRef.current[found.dayIndex]
          : daysRef.current.find((item) => item.toDateString() === found.dayKey);
      updateHoverSlotRef.current({
        day,
        dayKey: found.dayKey,
        hour: found.hour,
        minute: found.minute,
      });
    };

    const onMove = (event) => {
      const drag = pointerDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
      if (!drag.active) {
        if (distance < DRAG_THRESHOLD_PX) return;
        drag.active = true;
        suppressClickRef.current = true;
        dragPayloadRef.current = drag.item;
        previewPos.current = { x: event.clientX, y: event.clientY };
        setDragItem(drag.item);
      }
      if (event.cancelable) event.preventDefault();
      movePreview(event.clientX, event.clientY);
      scrollCalendarTowardPointer(calendarRef.current, event.clientY);
      hoverFromPoint(event.clientX, event.clientY);
    };

    const finish = (event) => {
      const drag = pointerDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const active = drag.active;
      const item = drag.item;
      pointerDragRef.current = null;
      if (!active) {
        endDragRef.current();
        return;
      }
      const eatNextClick = (clickEvent) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        window.removeEventListener('click', eatNextClick, true);
      };
      window.addEventListener('click', eatNextClick, true);
      dropAtPointRef.current(event.clientX, event.clientY, item);
    };

    const cancelPointerDrag = (event) => {
      const drag = pointerDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      pointerDragRef.current = null;
      endDragRef.current();
    };

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (!pointerDragRef.current && !dragPayloadRef.current) return;
      pointerDragRef.current = null;
      endDragRef.current();
    };

    window.addEventListener('pointermove', onMove, { passive: false, capture: true });
    window.addEventListener('pointerup', finish, true);
    window.addEventListener('pointercancel', cancelPointerDrag, true);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointermove', onMove, { capture: true });
      window.removeEventListener('pointerup', finish, true);
      window.removeEventListener('pointercancel', cancelPointerDrag, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const weekLabel = `${formatDdMmYyyy(days[0])} – ${formatDdMmYyyy(days[6])}`;
  const dragTimeSlot =
    dragItem && (hoverSlot || (dragItem.hour != null ? { day: dragItem.day, hour: dragItem.hour, minute: dragItem.minute } : null));
  const dragTimeLabel =
    dragItem && dragTimeSlot
      ? `${dragTimeSlot.day ? `${dragTimeSlot.day.toLocaleDateString(undefined, { weekday: 'short' })} ${dragTimeSlot.day.getDate()} · ` : ''}${formatClockRange(
          dragTimeSlot.hour,
          dragTimeSlot.minute,
          dragItem.minutes || 60
        )}`
      : 'Drop on a time slot';

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">
            {viewEmail === ALL_TRAINERS
              ? `${visibleSessions.length} this week`
              : viewTrainer?.name || viewEmail}
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
            <TrainerSelect
              compact
              allowAll
              label="View trainings"
              value={viewEmail}
              onChange={setViewEmail}
              team={team}
              currentEmail={user?.email}
            />
          </div>
          {viewTrainer && canEditTrainerCalendar(viewTrainer.email) ? (
            <TrainerCalendarIdField
              trainer={viewTrainer}
              busy={busy}
              onSave={(calendarId) => saveTrainerCalendarId(viewTrainer.email, calendarId)}
            />
          ) : null}
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

      <div
        className="sticky z-30 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm"
        style={{ top: 'var(--crm-header-h, 7.5rem)' }}
      >
        <p className="text-sm font-medium text-slate-700">Type</p>
        <WorkTypeSelect
          value={typeFilter}
          allowAll
          onChange={(type) => {
            setTypeFilter(type);
            if (type !== 'All') setWorkType(type);
          }}
        />
      </div>

      {error ? <p className="rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}
      {busy ? <p className="text-sm text-slate-500">Updating calendar…</p> : null}

      <TrainerStatusBoard
        team={team}
        clients={clients}
        sessions={sessions}
        currentEmail={user?.email}
        selectedEmail={viewEmail}
        onSelect={setViewEmail}
      />

      <div
        className="grid min-h-0 items-stretch gap-4 lg:grid-cols-[240px_minmax(0,1fr)]"
        style={{ minHeight: MIN_CALENDAR_PX, height: `max(${MIN_CALENDAR_PX}px, calc(100vh - 14rem))` }}
      >
        <aside className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-sm font-medium">Clients</p>
          <label className="mb-3 block text-xs text-slate-600">
            Type
            <select
              className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800"
              value={typeFilter}
              onChange={(event) => {
                const next = event.target.value;
                setTypeFilter(next);
                if (next !== 'All') setWorkType(next);
              }}
            >
              <option value="All">All types</option>
              {WORK_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <div className="min-h-0 flex-1 space-y-2 overflow-auto">
            {queue.length === 0 ? (
              <p className="rounded border border-dashed border-slate-300 p-3 text-sm text-slate-500">
                No clients.
              </p>
            ) : null}
            {queue.map((client) => (
              <div key={client.Client_ID}>
                <ClientChip
                  client={client}
                  selected={selectedId === client.Client_ID}
                  trainerLabel={
                    client.Assigned_Trainer
                      ? team.find((member) => sameEmail(member.email, client.Assigned_Trainer))?.name || client.Assigned_Trainer
                      : 'Unassigned'
                  }
                  sessionCount={sessions.filter((session) => session.Client_ID === client.Client_ID).length}
                  onSelect={() => setSelectedId((id) => (id === client.Client_ID ? '' : client.Client_ID))}
                  onPointerDown={(event) =>
                    startPointerDrag(event, {
                      kind: 'client',
                      id: client.Client_ID,
                      name: client.Client_Name,
                      workType: typeFilter !== 'All' ? workType : clientWorkType(client),
                      minutes: duration,
                    })
                  }
                />
                {privileges.canSetLeadEmail &&
                (selectedId === client.Client_ID || !isValidLeadEmail(clientLeadEmail(client, leads))) ? (
                  <div className="mt-1 mb-1">
                    <LeadEmailField client={client} compact />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </aside>

        <div ref={calendarRef} className="min-h-0 overflow-auto rounded-lg border border-slate-300 bg-white">
          <div className="grid min-w-[900px]" style={{ gridTemplateColumns: `56px repeat(${DAY_COUNT}, minmax(0, 1fr))` }}>
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
                  {formatClockLabel(slot.hour, slot.minute)}
                </div>
              ))}
            </div>

            {days.map((day, index) => (
              <DayColumn
                key={day.toISOString()}
                day={day}
                dayKey={day.toDateString()}
                dayIndex={index}
                isToday={sameDate(day, today)}
                hoverKey={hoverKey}
                selected={Boolean(selected)}
                sessions={visibleSessions.filter((session) => {
                  const start = parseSheetDate(session.Start_Time);
                  return start && sameDate(start, day);
                })}
                clients={clients}
                team={team}
                showTrainer={viewEmail === ALL_TRAINERS}
                currentEmail={user?.email}
                dragItem={dragItem}
                dragPayloadRef={dragPayloadRef}
                onHover={updateHoverSlot}
                onPlace={(hour, minute, payload) => placeAt(day, hour, minute, payload)}
                onSelectSession={setActiveSession}
                onBeginSessionDrag={(event, session, client) => {
                  const start = parseSheetDate(session.Start_Time);
                  const end = parseSheetDate(session.End_Time);
                  const span = start && end ? Math.max(SLOT_MINUTES, Math.round((end.getTime() - start.getTime()) / 60000)) : duration;
                  startPointerDrag(event, {
                    kind: 'session',
                    id: session.Session_ID,
                    name: client?.Client_Name || session.Session_Title,
                    workType: sessionWorkType(session),
                    minutes: span,
                    hour: start?.getHours(),
                    minute: start?.getMinutes(),
                    day: start,
                  });
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {activeSession ? (
        <SessionPopover
          session={sessions.find((item) => item.Session_ID === activeSession.Session_ID) || activeSession}
          client={clients.find((client) => client.Client_ID === activeSession.Client_ID)}
          onClose={() => setActiveSession(null)}
        />
      ) : null}

      {dragItem ? (
        <div
          ref={previewRef}
          className="pointer-events-none fixed top-0 left-0 z-[80] w-52 rounded-lg border border-sky-300 bg-white px-2.5 py-2 shadow-lg"
          style={{ transform: `translate(${previewPos.current.x + 14}px, ${previewPos.current.y + 14}px)` }}
        >
          <p className="truncate text-sm font-medium text-slate-800">{dragItem.name}</p>
          <p className="truncate text-[11px] text-slate-500">{dragItem.workType === 'Doubt clarification' ? 'Doubt' : 'Training'}</p>
          <p className="mt-1 text-sm font-semibold text-sky-800">{dragTimeLabel}</p>
        </div>
      ) : null}
    </section>
  );
}

function TrainerCalendarIdField({ trainer, busy, onSave }) {
  const [value, setValue] = useState(trainer?.calendarId || '');
  useEffect(() => {
    setValue(trainer?.calendarId || '');
  }, [trainer?.email, trainer?.calendarId]);
  if (!trainer) return null;
  return (
    <label className="text-xs font-medium text-slate-600">
      Calendar ID
      <input
        className="mt-1 w-56 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal text-slate-800 disabled:bg-slate-50"
        value={value}
        disabled={busy}
        placeholder="primary or Gmail"
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          const next = normalizeCalendarId(value, trainer.email);
          if (next !== (trainer.calendarId || 'primary')) onSave(next);
        }}
      />
    </label>
  );
}

function ClientChip({ client, selected, sessionCount, trainerLabel, onSelect, onPointerDown }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      onPointerDown={onPointerDown}
      className={`flex w-full cursor-grab touch-none select-none items-start gap-2 rounded-lg border px-2 py-2 text-left active:cursor-grabbing ${
        selected ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
      }`}
    >
      <GripVertical size={14} className="pointer-events-none mt-1 shrink-0 text-slate-400" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{client.Client_Name}</span>
        <span className="block truncate text-xs text-slate-500">{client.Contact_Email || 'No email'}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1">
          <span className={`rounded px-1.5 py-0.5 text-[10px] ${workTypeColor(clientWorkType(client))}`}>
            {clientWorkType(client)}
          </span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] ${trainingColor(client.Training_Status)}`}>
            {normalizeTrainingStatus(client.Training_Status)}
          </span>
          <span className="text-[10px] text-slate-400">{sessionCount === 1 ? '1 session' : `${sessionCount} sessions`}</span>
          <span className="text-[10px] text-slate-500">{trainerLabel}</span>
        </span>
      </span>
    </div>
  );
}

function DayColumn({
  day,
  dayKey,
  dayIndex,
  isToday,
  hoverKey,
  selected,
  sessions,
  clients,
  team = [],
  showTrainer = false,
  currentEmail = '',
  dragItem,
  dragPayloadRef,
  onHover,
  onPlace,
  onSelectSession,
  onBeginSessionDrag,
}) {
  const dropOnColumn = (event) => {
    event.preventDefault();
    const slot = slotFromPointer(event, event.currentTarget);
    onHover(null);
    onPlace(slot.hour, slot.minute, payloadFromDrop(event, dragPayloadRef?.current || dragItem));
  };

  const hoverThisDay = hoverKey.startsWith(`${day.toDateString()}-`);
  const ghostMinutes = dragItem?.minutes || 60;
  const ghostSlot = hoverThisDay && dragItem ? slots.find((slot) => hoverKey === `${day.toDateString()}-${slot.hour}-${slot.minute}`) : null;
  const ghostEnd = ghostSlot ? addClockMinutes(ghostSlot.hour, ghostSlot.minute, ghostMinutes) : null;

  return (
    <div
      data-day-column={dayKey || day.toDateString()}
      data-day-index={dayIndex}
      className={`relative border-l border-slate-200 ${isToday ? 'bg-sky-50/40' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = dragItem?.kind === 'session' ? 'move' : 'copy';
        const slot = slotFromPointer(event, event.currentTarget);
        onHover({ day, dayKey: day.toDateString(), hour: slot.hour, minute: slot.minute });
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onHover(null);
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
        const cancelled = isCancelledSession(session);
        const reason = sessionCancelReason(session);
        const movable = isMovableSession(session);
        return (
          <div
            key={session.Session_ID}
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              onSelectSession(session);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelectSession(session);
              }
            }}
            onPointerDown={(event) => {
              if (!movable) return;
              event.stopPropagation();
              onBeginSessionDrag(event, session, client);
            }}
            className={`absolute right-1 left-1 z-10 overflow-hidden rounded px-1.5 py-0.5 text-left text-[11px] shadow-sm ${
              movable ? 'cursor-grab touch-none select-none active:cursor-grabbing' : 'cursor-pointer'
            } ${sessionColor(session.Status)} ${
              dragItem?.id === session.Session_ID ? 'pointer-events-none ring-2 ring-sky-400 ring-offset-1' : ''
            }`}
            style={{ top: top + 2, height }}
            title={`${client?.Client_Name || session.Session_Title} · ${sessionWorkType(session)} · ${
              team.find((member) => sameEmail(member.email, session.Trainer_Email))?.name || session.Trainer_Email || 'Unassigned'
            } · ${formatClock(start.getHours(), start.getMinutes())}–${formatClock(end.getHours(), end.getMinutes())} · ${session.Status}${
              cancelled ? ` · ${reason || 'No reason recorded'}` : ''
            }`}
          >
            <span className={`block truncate font-medium ${cancelled ? 'line-through' : ''}`}>
              {client?.Client_Name || session.Session_Title}
            </span>
            <span className="block truncate opacity-80">
              {cancelled
                ? `Cancelled${reason ? `: ${reason}` : ''}`
                : `${sessionWorkType(session) === 'Doubt clarification' ? 'Doubt' : 'Training'} · ${
                    start.getMinutes() === 0
                      ? formatClockLabel(start.getHours(), start.getMinutes())
                      : formatClock(start.getHours(), start.getMinutes())
                  }${
                    showTrainer
                      ? ` · ${
                          sameEmail(session.Trainer_Email, currentEmail)
                            ? 'You'
                            : team.find((member) => sameEmail(member.email, session.Trainer_Email))?.name?.split(' ')[0] ||
                              session.Trainer_Email ||
                              '—'
                        }`
                      : ''
                  }`}
            </span>
          </div>
        );
      })}

      {ghostSlot && dragItem ? (
        <div
          className="pointer-events-none absolute right-1 left-1 z-20 overflow-hidden rounded border-2 border-dashed border-sky-500 bg-sky-100/90 px-1.5 py-0.5 text-left text-[11px] text-sky-900 shadow-sm"
          style={{
            top: (minutesFromStart(atSlot(day, ghostSlot.hour, ghostSlot.minute)) / SLOT_MINUTES) * ROW_HEIGHT + 2,
            height: Math.max(ROW_HEIGHT - 4, (ghostMinutes / SLOT_MINUTES) * ROW_HEIGHT - 4),
          }}
        >
          <span className="block truncate font-medium">{dragItem.name}</span>
          <span className="block truncate">
            {formatClock(ghostSlot.hour, ghostSlot.minute)} – {formatClock(ghostEnd.hour, ghostEnd.minute)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function sessionToClientStatus(session) {
  if (session?.Status === 'Completed') return 'Completed';
  if (session?.Status === 'Cancelled') return 'Not started';
  return 'Ongoing';
}

function SessionPopover({ session, client, onClose }) {
  const { updateSession, updateClient, setClientTrainingStatus } = useCrmStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [askingReason, setAskingReason] = useState(false);
  const [cancelReason, setCancelReason] = useState(session.Cancel_Reason || '');
  const start = parseSheetDate(session.Start_Time);
  const end = parseSheetDate(session.End_Time);
  const status = client ? normalizeTrainingStatus(client.Training_Status) : sessionToClientStatus(session);
  const sessionType = sessionWorkType(session);

  const run = async (action) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err.message || 'Could not update status.');
    } finally {
      setBusy(false);
    }
  };

  const applyStatus = async (nextStatus) => {
    if (nextStatus === 'Completed') {
      await updateSession(session.Session_ID, { Status: 'Completed' });
      if (client?.Client_ID) await setClientTrainingStatus(client.Client_ID, 'Completed');
      return;
    }
    const sessionStatus = nextStatus === 'Not started' ? 'Scheduled' : session.Status === 'Rescheduled' ? 'Rescheduled' : 'Scheduled';
    await updateSession(session.Session_ID, { Status: sessionStatus, Cancel_Reason: '' });
    if (client?.Client_ID) await setClientTrainingStatus(client.Client_ID, nextStatus);
  };

  const confirmCancel = async () => {
    const reason = cancelReason.trim();
    if (!reason) {
      setError('Add a reason for cancelling this session.');
      return;
    }
    await run(async () => {
      await updateSession(session.Session_ID, { Status: 'Cancelled', Cancel_Reason: reason });
      setAskingReason(false);
    });
  };

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
          {start
            ? `${formatDdMmYyyy(start)} · ${formatClock(start.getHours(), start.getMinutes())}`
            : '—'}
          {end ? ` – ${formatClock(end.getHours(), end.getMinutes())}` : ''}
        </p>
        <p className="text-sm text-slate-500">{session.Trainer_Email}</p>
        {session.Calendar_ID ? <p className="text-xs text-slate-400">Calendar: {session.Calendar_ID}</p> : null}
        {client ? <LeadEmailField client={client} /> : null}
        {error ? <p className="mt-2 rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}

        <label className="mt-4 block text-sm">
          Status
          <select
            disabled={busy}
            className={`mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm ${trainingColor(status)}`}
            value={status}
            onChange={(event) => run(() => applyStatus(event.target.value))}
          >
            {TRAINING_STATUSES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        <label className="mt-3 block text-sm">
          Type
          <select
            disabled={busy}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={sessionType}
            onChange={(event) =>
              run(async () => {
                const next = event.target.value;
                await updateSession(session.Session_ID, { Session_Type: next });
                if (client?.Client_ID) await updateClient(client.Client_ID, { Work_Type: next });
              })
            }
          >
            {WORK_TYPES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        {isCancelledSession(session) ? (
          <p className="mt-3 rounded border border-rose-100 bg-rose-50 p-2 text-sm text-rose-800">
            Cancelled: {sessionCancelReason(session) || 'No reason recorded'}
          </p>
        ) : null}

        {askingReason && session.Status !== 'Cancelled' ? (
          <div className="mt-4">
            <label className="block text-sm">
              Reason for cancellation
              <textarea
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                rows={3}
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder="Why is this session being cancelled?"
              />
            </label>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                className="rounded border border-slate-300 px-3 py-2 text-sm"
                onClick={() => {
                  setAskingReason(false);
                  setError('');
                }}
              >
                Back
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded bg-rose-700 px-3 py-2 text-sm text-white disabled:opacity-50"
                onClick={confirmCancel}
              >
                {busy ? 'Cancelling…' : 'Confirm cancel'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">Drag this block to another slot to reschedule.</p>
            {session.Status !== 'Cancelled' ? (
              <button
                type="button"
                disabled={busy}
                className="shrink-0 rounded bg-rose-700 px-3 py-2 text-sm text-white disabled:opacity-50"
                onClick={() => {
                  setError('');
                  setAskingReason(true);
                }}
              >
                Cancel session
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

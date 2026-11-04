import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCrmStore } from '../../store/crmStore';
import { fromLocalInput, toLocalInput } from '../../utils/constants';
import Modal from '../shared/Modal';

const emptySlot = () => ({
  title: 'Training session',
  start: toLocalInput(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()),
  end: toLocalInput(new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()),
});

export default function ScheduleSessionModal({ client, onClose }) {
  const { user } = useAuth();
  const { scheduleSessions } = useCrmStore();
  const [trainerEmail, setTrainerEmail] = useState(client.Assigned_Trainer || user?.email || '');
  const [slots, setSlots] = useState([emptySlot()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const updateSlot = (index, key, value) => {
    setSlots((prev) => prev.map((slot, i) => (i === index ? { ...slot, [key]: value } : slot)));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!trainerEmail.trim()) {
      setError('Trainer email is required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await scheduleSessions({
        client,
        trainerEmail: trainerEmail.trim(),
        sessions: slots.map((slot) => ({
          title: slot.title || `Training · ${client.Client_Name}`,
          start: fromLocalInput(slot.start),
          end: fromLocalInput(slot.end),
        })),
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Schedule training · ${client.Client_Name}`} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        {error ? <p className="rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}
        <label className="block text-sm">
          Trainer email
          <input
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={trainerEmail}
            onChange={(e) => setTrainerEmail(e.target.value)}
          />
        </label>
        <p className="text-sm text-slate-500">
          Each session creates a Google Calendar event with a Meet link and invites the client plus trainer.
        </p>

        {slots.map((slot, index) => (
          <div key={index} className="rounded border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Session {index + 1}</p>
              {slots.length > 1 ? (
                <button
                  type="button"
                  className="text-xs text-rose-600"
                  onClick={() => setSlots((prev) => prev.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              ) : null}
            </div>
            <label className="block text-sm">
              Title
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                value={slot.title}
                onChange={(e) => updateSlot(index, 'title', e.target.value)}
              />
            </label>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                Start
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                  value={slot.start}
                  onChange={(e) => updateSlot(index, 'start', e.target.value)}
                  required
                />
              </label>
              <label className="text-sm">
                End
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                  value={slot.end}
                  onChange={(e) => updateSlot(index, 'end', e.target.value)}
                  required
                />
              </label>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setSlots((prev) => [...prev, emptySlot()])}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          Add another session
        </button>

        <div className="flex gap-2">
          <button type="submit" disabled={busy} className="rounded bg-slate-900 px-4 py-2 text-white">
            {busy ? 'Creating calendar events…' : 'Schedule training'}
          </button>
          <button type="button" onClick={onClose} className="rounded border border-slate-300 px-4 py-2">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

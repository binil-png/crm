import { useState } from 'react';
import { useCrmStore } from '../../store/crmStore';
import { CLOSE_OUTCOMES } from '../../utils/constants';
import Modal from '../shared/Modal';

export default function SalesCloseModal({ lead, onClose }) {
  const { closeLead } = useCrmStore();
  const [outcome, setOutcome] = useState('Demo Done-Closed');
  const [comment, setComment] = useState('');
  const [passToTraining, setPassToTraining] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await closeLead(lead, {
        outcome,
        comment: comment || `Marked ${outcome}`,
        passToTraining: outcome === 'Demo Done-Closed' && passToTraining,
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Close lead · ${lead['Customer Name']}`} onClose={onClose}>
      {error ? <p className="mb-3 rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}
      <p className="text-sm text-slate-600">
        Updates Status on the executive sheet. Closed-won clients can be handed to the training team.
      </p>

      <label className="mt-4 block text-sm">
        Outcome
        <select
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
        >
          {CLOSE_OUTCOMES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>

      <label className="mt-3 block text-sm">
        Closing comment
        <textarea
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Stage note appended to Comments"
        />
      </label>

      {outcome === 'Demo Done-Closed' ? (
        <label className="mt-4 flex items-start gap-2 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={passToTraining}
            onChange={(e) => setPassToTraining(e.target.checked)}
          />
          <span>
            <span className="font-medium text-emerald-900">Pass this client to the training team</span>
            <span className="mt-0.5 block text-emerald-800">
              Technical members will see the account, pick it for onboarding, and schedule training sessions.
            </span>
          </span>
        </label>
      ) : null}

      <div className="mt-5 flex gap-2">
        <button type="button" onClick={submit} disabled={busy} className="rounded bg-slate-900 px-4 py-2 text-white">
          {busy ? 'Saving…' : 'Confirm'}
        </button>
        <button type="button" onClick={onClose} className="rounded border border-slate-300 px-4 py-2">
          Cancel
        </button>
      </div>
    </Modal>
  );
}

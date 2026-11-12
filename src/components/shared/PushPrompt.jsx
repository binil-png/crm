import { Bell, BellOff, BellRing } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  getPushPermission,
  isPushConfigured,
  requestPushPermission,
} from '../../services/pushNotifications';

export default function PushPrompt() {
  const [permission, setPermission] = useState('default');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPushConfigured()) return undefined;
    getPushPermission().then(setPermission).catch(() => {});
    return undefined;
  }, []);

  if (!isPushConfigured() || permission === 'unsupported') return null;

  const enable = async () => {
    setBusy(true);
    try {
      const next = await requestPushPermission();
      setPermission(next);
    } catch {
      setPermission('denied');
    } finally {
      setBusy(false);
    }
  };

  if (permission === 'granted') {
    return (
      <p className="inline-flex items-center gap-1 text-xs text-emerald-700" title="Push alerts stay on after you close this tab">
        <BellRing size={14} />
        Alerts on
      </p>
    );
  }

  if (permission === 'denied') {
    return (
      <p className="inline-flex items-center gap-1 text-xs text-slate-500" title="Allow notifications for this site in the browser settings">
        <BellOff size={14} />
        Alerts blocked
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={enable}
      disabled={busy}
      className="inline-flex items-center gap-1 rounded border border-sky-200 bg-sky-50 px-2 py-1 text-xs text-sky-800 disabled:opacity-60"
      title="Get call and session reminders even after you close the CRM"
    >
      <Bell size={14} />
      {busy ? 'Waiting…' : 'Enable alerts'}
    </button>
  );
}

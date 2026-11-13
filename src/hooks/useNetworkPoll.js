import { useEffect, useRef } from 'react';
import { useCrmStore } from '../store/crmStore';
import { isSheetsQuotaError } from '../services/sheetsService';
import { POLL_INTERVAL_MS, POLL_MAX_BACKOFF_MS } from '../utils/constants';

const canIdle = () => typeof requestIdleCallback === 'function';

export default function useNetworkPoll(enabled) {
  const refreshAll = useCrmStore((state) => state.refreshAll);
  const timerRef = useRef(0);
  const idleRef = useRef(0);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;

    const clearTimers = () => {
      window.clearTimeout(timerRef.current);
      if (idleRef.current && typeof cancelIdleCallback === 'function') {
        cancelIdleCallback(idleRef.current);
        idleRef.current = 0;
      }
    };

    const whenIdle = (fn) => {
      if (canIdle()) {
        idleRef.current = requestIdleCallback(() => fn(), { timeout: 2500 });
        return;
      }
      timerRef.current = window.setTimeout(fn, 0);
    };

    const shouldPoll = () =>
      !cancelled &&
      document.visibilityState === 'visible' &&
      (typeof navigator === 'undefined' || navigator.onLine !== false);

    let delay = POLL_INTERVAL_MS;

    const loop = async () => {
      if (cancelled) return;
      if (shouldPoll()) {
        try {
          await refreshAll({ silent: true });
          delay = POLL_INTERVAL_MS;
        } catch (error) {
          delay = isSheetsQuotaError(error) ? Math.min(Math.max(delay, POLL_INTERVAL_MS) * 2, POLL_MAX_BACKOFF_MS) : POLL_INTERVAL_MS;
        }
      }
      if (cancelled) return;
      timerRef.current = window.setTimeout(() => whenIdle(loop), delay);
    };

    timerRef.current = window.setTimeout(() => whenIdle(loop), POLL_INTERVAL_MS);

    const resume = () => {
      if (!shouldPoll()) return;
      const lastSyncedAt = useCrmStore.getState().lastSyncedAt;
      if (lastSyncedAt && Date.now() - lastSyncedAt < POLL_INTERVAL_MS) return;
      clearTimers();
      whenIdle(loop);
    };

    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', resume);

    return () => {
      cancelled = true;
      clearTimers();
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('online', resume);
    };
  }, [enabled, refreshAll]);
}

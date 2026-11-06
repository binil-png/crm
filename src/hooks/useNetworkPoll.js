import { useEffect, useRef } from 'react';
import { useCrmStore } from '../store/crmStore';
import { POLL_INTERVAL_MS } from '../utils/constants';

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

    const loop = async () => {
      if (cancelled) return;
      if (shouldPoll()) {
        await refreshAll({ silent: true }).catch(() => {});
      }
      if (cancelled) return;
      timerRef.current = window.setTimeout(() => whenIdle(loop), POLL_INTERVAL_MS);
    };

    timerRef.current = window.setTimeout(() => whenIdle(loop), POLL_INTERVAL_MS);

    const resume = () => {
      if (!shouldPoll()) return;
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

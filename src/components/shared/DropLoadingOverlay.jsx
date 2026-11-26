import { Loader2 } from 'lucide-react';

export default function DropLoadingOverlay({ show, label = 'Saving…', fullScreen = false }) {
  if (!show) return null;
  return (
    <div
      className={`${fullScreen ? 'fixed' : 'absolute'} inset-0 z-[80] flex items-center justify-center bg-white/70`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-md">
        <Loader2 size={16} className="animate-spin text-sky-700" />
        {label}
      </div>
    </div>
  );
}

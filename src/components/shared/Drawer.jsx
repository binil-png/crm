import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function Drawer({
  title,
  open,
  onClose,
  onOpen,
  children,
  wide = false,
  edgeLabel = 'Open',
  edgeBadge = 0,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const toggle = () => {
    if (open) onClose();
    else if (onOpen) onOpen();
  };

  return (
    <>
      {open ? null : (
        <button
          type="button"
          onClick={toggle}
          title={`Open ${edgeLabel}`}
          className="fixed top-1/2 right-0 z-50 flex w-8 -translate-y-1/2 flex-col items-center justify-center gap-0.5 rounded-l-md border border-r-0 border-slate-300 bg-slate-900 py-2 text-white shadow-md transition-colors duration-200 hover:bg-slate-800"
        >
          <ChevronLeft size={12} />
          <span className="text-[10px] font-medium tracking-wide" style={{ writingMode: 'vertical-rl' }}>
            {edgeLabel}
          </span>
          {edgeBadge ? (
            <span className="min-w-4 rounded-full bg-rose-500 px-0.5 text-[9px] font-semibold leading-4">
              {edgeBadge}
            </span>
          ) : null}
        </button>
      )}

      {open ? (
        <div className="fixed inset-0 z-40 overflow-hidden">
          <button
            type="button"
            aria-label="Close drawer"
            className="absolute inset-0 bg-slate-900/40"
            onClick={onClose}
          />
          <aside
            className={`absolute inset-y-0 right-0 flex w-full flex-col bg-slate-50 shadow-2xl ${
              wide ? 'max-w-[900px]' : 'max-w-md'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
              <h2 className="text-sm font-semibold">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                <X size={16} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

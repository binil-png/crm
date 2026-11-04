export default function Modal({ title, children, onClose, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className={`max-h-[90vh] overflow-y-auto rounded-lg bg-white p-5 shadow-xl ${wide ? 'w-full max-w-3xl' : 'w-full max-w-lg'}`}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-800">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

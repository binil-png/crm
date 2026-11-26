export default function TabBox({ tabs = [], value, onChange, children, plain = false }) {
  return (
    <div className={plain ? '' : 'overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'}>
      <div
        className={`flex gap-1 overflow-x-auto px-2 ${plain ? '' : 'border-b border-slate-200 bg-slate-50'}`}
        role="tablist"
      >
        {tabs.map((item) => {
          const active = value === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange?.(item.id)}
              className={`shrink-0 border-b-2 px-3 py-2.5 text-sm ${
                active
                  ? 'border-slate-900 font-medium text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {item.label}
              {item.badge ? (
                <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 text-[10px] font-medium text-slate-700">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className={plain ? '' : 'p-4 sm:p-5'}>{children}</div>
    </div>
  );
}

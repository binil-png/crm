import { WORK_TYPES, normalizeWorkType, workTypeColor } from '../../utils/constants';

export default function WorkTypeSelect({ value, onChange, compact = false }) {
  const current = normalizeWorkType(value);
  return (
    <div className={compact ? 'flex flex-wrap gap-1' : 'flex flex-wrap gap-2'}>
      {WORK_TYPES.map((type) => {
        const active = current === type;
        return (
          <button
            key={type}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(type)}
            className={`rounded px-2 py-1 text-xs ${
              active
                ? `${workTypeColor(type)} ring-2 ring-slate-700`
                : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-400'
            }`}
          >
            {type}
          </button>
        );
      })}
    </div>
  );
}

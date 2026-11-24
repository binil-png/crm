import { WORK_TYPES, normalizeWorkType, workTypeColor } from '../../utils/constants';

export default function WorkTypeSelect({
  value,
  onChange,
  compact = false,
  allowAll = false,
  disabled = false,
}) {
  const options = allowAll ? ['All', ...WORK_TYPES] : WORK_TYPES;
  const current = value === 'All' ? 'All' : normalizeWorkType(value);

  return (
    <div className={`relative z-20 ${compact ? 'flex flex-wrap gap-1' : 'flex flex-wrap gap-2'}`}>
      {options.map((type) => {
        const active = current === type;
        return (
          <button
            key={type}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!disabled) onChange(type);
            }}
            className={`${compact ? 'rounded px-2 py-1 text-xs' : 'rounded px-3 py-1.5 text-sm'} ${
              active
                ? type === 'All'
                  ? 'bg-slate-900 text-white'
                  : `${workTypeColor(type)} ring-2 ring-slate-700`
                : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-400'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {type}
          </button>
        );
      })}
    </div>
  );
}

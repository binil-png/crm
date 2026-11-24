import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { formatDdMmYyyy, parseSheetDate, toNativeDateValue } from '../../utils/constants';

export default function DatePickerField({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
}) {
  const nativeValue = toNativeDateValue(value);
  const formatted = parseSheetDate(value) ? formatDdMmYyyy(value) : '';
  const [draft, setDraft] = useState(formatted);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(formatted);
  }, [formatted, focused]);

  const pick = (event) => {
    const next = event.target.value;
    const display = next ? formatDdMmYyyy(next) : '';
    setDraft(display);
    onChange(display);
  };

  const commitDraft = (raw) => {
    const trimmed = String(raw || '').trim();
    if (!trimmed) {
      setDraft('');
      onChange('');
      return;
    }
    const parsed = parseSheetDate(trimmed);
    if (!parsed) return;
    const display = formatDdMmYyyy(parsed);
    setDraft(display);
    onChange(display);
  };

  return (
    <div className="block text-sm">
      {label ? <span>{label}</span> : null}
      <div className="relative mt-1">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          required={required}
          disabled={disabled}
          placeholder="DD-MM-YYYY"
          aria-label={label || 'Date'}
          className="w-full rounded border border-slate-300 px-3 py-2 pr-10"
          value={focused ? draft : formatted || draft}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            commitDraft(draft);
            setFocused(false);
          }}
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            if (!next.trim()) {
              onChange('');
              return;
            }
            const parsed = parseSheetDate(next);
            if (parsed) onChange(formatDdMmYyyy(parsed));
          }}
        />
        <div className="absolute inset-y-0 right-0 w-10">
          <input
            type="date"
            lang="en-GB"
            disabled={disabled}
            aria-label={label ? `Choose ${label}` : 'Choose date'}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            value={nativeValue}
            onChange={pick}
          />
          <Calendar
            size={16}
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-500"
          />
        </div>
      </div>
    </div>
  );
}

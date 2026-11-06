import { combineDateAndTime, toDateInput, toTimeInput } from '../../utils/constants';

export default function ScheduleDateTimeFields({
  value,
  onChange,
  dateLabel = 'Scheduled date',
  timeLabel = 'Scheduled time',
  required = false,
}) {
  const dateValue = toDateInput(value);
  const timeValue = toTimeInput(value);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label className="block text-sm">
        {dateLabel}
        <input
          type="date"
          required={required}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          value={dateValue}
          onChange={(event) => onChange(combineDateAndTime(event.target.value, timeValue))}
        />
      </label>
      <label className="block text-sm">
        {timeLabel}
        <input
          type="time"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          value={timeValue}
          onChange={(event) => onChange(combineDateAndTime(dateValue, event.target.value))}
        />
      </label>
    </div>
  );
}

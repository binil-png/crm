import { combineDateAndTime, toDateInput, toTimeInput } from '../../utils/constants';
import DatePickerField from '../shared/DatePickerField';

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
      <DatePickerField
        label={dateLabel}
        required={required}
        value={dateValue}
        onChange={(next) => onChange(combineDateAndTime(next, timeValue))}
      />
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

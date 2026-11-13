import { sameEmail } from '../../utils/constants';

export const ALL_TRAINERS = 'all';

export default function TrainerSelect({
  value,
  onChange,
  team = [],
  currentEmail = '',
  label = 'Training team member',
  compact = false,
  required = false,
  allowAll = false,
  allowEmpty = true,
  allowUnassigned = false,
}) {
  const selected = team.find((member) => sameEmail(member.email, value));
  return (
    <label className={`block ${compact ? 'text-xs' : 'text-sm'}`}>
      {label}
      <select
        required={required && value !== ALL_TRAINERS}
        className={`mt-1 w-full rounded border border-slate-300 ${compact ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {allowAll ? <option value={ALL_TRAINERS}>All trainers</option> : null}
        {allowEmpty && !allowAll ? <option value="">Select a trainer</option> : null}
        {allowUnassigned ? <option value="unassigned">Unassigned</option> : null}
        {team.map((member) => (
          <option key={member.email} value={member.email}>
            {sameEmail(member.email, currentEmail) ? `${member.name} (you)` : member.name} — {member.email}
          </option>
        ))}
      </select>
      {selected?.calendarId && value !== ALL_TRAINERS ? (
        <span className={`mt-1 block ${compact ? 'text-[11px]' : 'text-xs'} text-slate-500`}>
          {sameEmail(selected.email, currentEmail) ? 'Your calendar' : 'Calendar'}: {selected.calendarId}
        </span>
      ) : null}
    </label>
  );
}

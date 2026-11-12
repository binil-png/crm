export default function TrainerSelect({
  value,
  onChange,
  team = [],
  label = 'Training team member',
  compact = false,
  required = false,
}) {
  return (
    <label className={`block ${compact ? 'text-xs' : 'text-sm'}`}>
      {label}
      <select
        required={required}
        className={`mt-1 w-full rounded border border-slate-300 ${compact ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select a trainer</option>
        {team.map((member) => (
          <option key={member.email} value={member.email}>
            {member.name} — {member.email}
          </option>
        ))}
      </select>
    </label>
  );
}

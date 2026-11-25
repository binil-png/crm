import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCrmStore } from '../../store/crmStore';
import { USER_ROLES, USER_TYPES, formatDateTime, normalizeRegistered, sameEmail } from '../../utils/constants';

export default function UsersPanel() {
  const { user, privileges, applyDirectory } = useAuth();
  const { users, updateDirectoryUser, refreshAll } = useCrmStore();
  const [error, setError] = useState('');
  const [busyEmail, setBusyEmail] = useState('');

  const canEditCalendar = (row) =>
    Boolean(
      privileges.canManageUsers ||
        (privileges.canEditOwnCalendar && sameEmail(row.Email, user?.email)) ||
        (privileges.canEditTeamCalendar && (row['User Type'] || 'Sales') === privileges.type)
    );

  const save = async (row, patch) => {
    if ((patch['User Type'] || patch['User Role']) && !privileges.canEditUserTypeRole) return;
    if (patch['Sheet Name'] !== undefined && !privileges.canManageUsers) return;
    if (patch['Calendar ID'] !== undefined && !canEditCalendar(row)) return;
    setError('');
    setBusyEmail(row.Email);
    try {
      const next = await updateDirectoryUser(row.Email, patch);
      if (String(user?.email || '').toLowerCase() === String(row.Email || '').toLowerCase()) {
        applyDirectory(next);
      }
      if (patch['Sheet Name'] !== undefined) await refreshAll({ force: true });
    } catch (err) {
      setError(err.message || 'Could not update the Users sheet.');
    } finally {
      setBusyEmail('');
    }
  };

  return (
    <section>
      <h2 className="text-lg font-semibold">Users</h2>
      <p className="mb-4 text-sm text-slate-500">
        Google login adds the Gmail name and email here and sets Registered to Yes.
        User details are stored on the user details spreadsheet configured under Google sheets.
        Sheet Name is the sales tab loaded for that user.
        Calendar ID is the Google Calendar used for that training user when sessions are scheduled.
        Use primary, the trainer Gmail, or a calendar ID such as xxx@group.calendar.google.com.
        {privileges.canManageUsers
          ? ' Admins can change User Type, User Role, Calendar ID, and Sheet Name.'
          : ' Team leads can view the roster and update Calendar ID for people in the same department. Training users can set their own Calendar ID.'}
      </p>
      {error ? <p className="mb-3 rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}
      {users.length === 0 ? (
        <p className="rounded border border-dashed border-slate-300 p-4 text-sm text-slate-500">No users recorded yet.</p>
      ) : (
        <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Username</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">User type</th>
                <th className="px-3 py-2">User role</th>
                <th className="px-3 py-2">Calendar ID</th>
                <th className="px-3 py-2">Sheet Name</th>
                <th className="px-3 py-2">Last login</th>
                <th className="px-3 py-2">Registered</th>
              </tr>
            </thead>
            <tbody>
              {users.map((row) => (
                <tr key={row.Email || row._row} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium">{row.Username || '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{row.Email}</td>
                  <td className="px-3 py-2">
                    <select
                      disabled={!privileges.canEditUserTypeRole || busyEmail === row.Email}
                      className="rounded border border-slate-300 px-2 py-1 disabled:bg-slate-50"
                      value={row['User Type'] || 'Sales'}
                      onChange={(event) => save(row, { 'User Type': event.target.value })}
                    >
                      {USER_TYPES.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      disabled={!privileges.canEditUserTypeRole || busyEmail === row.Email}
                      className="rounded border border-slate-300 px-2 py-1 disabled:bg-slate-50"
                      value={row['User Role'] || 'Team member'}
                      onChange={(event) => save(row, { 'User Role': event.target.value })}
                    >
                      {USER_ROLES.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      key={`${row.Email}-cal-${row['Calendar ID'] || ''}`}
                      defaultValue={row['Calendar ID'] || 'primary'}
                      disabled={busyEmail === row.Email || !canEditCalendar(row)}
                      className="w-56 rounded border border-slate-300 px-2 py-1 disabled:bg-slate-50"
                      placeholder="primary, Gmail, or calendar ID"
                      title="Google Calendar used for this training user's sessions"
                      onBlur={(event) => {
                        const next = event.target.value.trim() || 'primary';
                        if (next !== (row['Calendar ID'] || 'primary')) save(row, { 'Calendar ID': next });
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      defaultValue={row['Sheet Name'] || ''}
                      disabled={busyEmail === row.Email || !privileges.canManageUsers}
                      className="w-40 rounded border border-slate-300 px-2 py-1 disabled:bg-slate-50"
                      placeholder="Sales tab name"
                      onBlur={(event) => {
                        const next = event.target.value.trim();
                        if (next !== (row['Sheet Name'] || '')) save(row, { 'Sheet Name': next });
                      }}
                    />
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">{formatDateTime(row['Last Login'])}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        normalizeRegistered(row.Registered) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {normalizeRegistered(row.Registered) ? 'Yes' : 'No'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

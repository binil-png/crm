import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCrmStore } from '../../store/crmStore';
import { USER_ROLES, USER_TYPES } from '../../utils/constants';

export default function UsersPanel() {
  const { user, isAdmin, applyDirectory } = useAuth();
  const { users, updateDirectoryUser } = useCrmStore();
  const [error, setError] = useState('');
  const [busyEmail, setBusyEmail] = useState('');

  const save = async (row, patch) => {
    setError('');
    setBusyEmail(row.Email);
    try {
      const next = await updateDirectoryUser(row.Email, patch);
      if (String(user?.email || '').toLowerCase() === String(row.Email || '').toLowerCase()) {
        applyDirectory(next);
      }
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
        Google sign-in writes Username and Email here. User Type chooses Sales or Technical support. User Role is Team
        member, Team lead, or Admin. Calendar ID is that person’s Google Calendar — use primary, their email, or a
        shared calendar ID. Training sessions assigned to them are created on that calendar.
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
              </tr>
            </thead>
            <tbody>
              {users.map((row) => (
                <tr key={row.Email || row._row} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium">{row.Username || '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{row.Email}</td>
                  <td className="px-3 py-2">
                    <select
                      disabled={!isAdmin || busyEmail === row.Email}
                      className="rounded border border-slate-300 px-2 py-1"
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
                      disabled={!isAdmin || busyEmail === row.Email}
                      className="rounded border border-slate-300 px-2 py-1"
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
                      defaultValue={row['Calendar ID'] || 'primary'}
                      disabled={busyEmail === row.Email}
                      className="w-56 rounded border border-slate-300 px-2 py-1"
                      placeholder="primary or calendar email"
                      onBlur={(event) => {
                        const next = event.target.value.trim() || 'primary';
                        if (next !== (row['Calendar ID'] || 'primary')) save(row, { 'Calendar ID': next });
                      }}
                    />
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

import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { isDemoMode } from '../../services/googleApi';
import { getWorkbookConfig, loadWorkbookConfig } from '../../services/sheetsService';
import { useCrmStore } from '../../store/crmStore';
import { parseSpreadsheetId } from '../../utils/constants';

const emptyForm = {
  configSpreadsheetId: '',
  salesAccount: '',
  spreadsheetId: '',
  trainingAccount: '',
  trainingSpreadsheetId: '',
  employeesAccount: '',
  employeesSpreadsheetId: '',
};

const Field = ({ label, hint, value, onChange, placeholder }) => (
  <label className="block text-sm">
    <span className="font-medium text-slate-800">{label}</span>
    <input
      className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
    />
    {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
  </label>
);

export default function SheetsConfigPanel() {
  const { user, privileges } = useAuth();
  const saveWorkbookConfig = useCrmStore((state) => state.saveWorkbookConfig);
  const [form, setForm] = useState(emptyForm);
  const [configHost, setConfigHost] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const apply = (current) => {
      setForm({
        configSpreadsheetId: current.configSpreadsheetId || current.spreadsheetId || '',
        salesAccount: current.salesAccount || '',
        spreadsheetId: current.spreadsheetId || '',
        trainingAccount: current.trainingAccount || '',
        trainingSpreadsheetId: current.trainingSpreadsheetId || '',
        employeesAccount: current.employeesAccount || '',
        employeesSpreadsheetId: current.employeesSpreadsheetId || '',
      });
      setConfigHost(current.configSpreadsheetId || '');
    };
    apply(getWorkbookConfig());
    loadWorkbookConfig()
      .then((current) => {
        if (!cancelled) apply(current);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load Google sheet details.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    if (!privileges.canManageSheets) return;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const next = await saveWorkbookConfig(
        {
          configSpreadsheetId: parseSpreadsheetId(form.configSpreadsheetId),
          salesAccount: form.salesAccount,
          spreadsheetId: parseSpreadsheetId(form.spreadsheetId),
          trainingAccount: form.trainingAccount,
          trainingSpreadsheetId: parseSpreadsheetId(form.trainingSpreadsheetId),
          employeesAccount: form.employeesAccount,
          employeesSpreadsheetId: parseSpreadsheetId(form.employeesSpreadsheetId),
        },
        user?.email
      );
      setForm({
        configSpreadsheetId: next.configSpreadsheetId || form.configSpreadsheetId,
        salesAccount: next.salesAccount || '',
        spreadsheetId: next.spreadsheetId || '',
        trainingAccount: next.trainingAccount || '',
        trainingSpreadsheetId: next.trainingSpreadsheetId || '',
        employeesAccount: next.employeesAccount || '',
        employeesSpreadsheetId: next.employeesSpreadsheetId || '',
      });
      setConfigHost(next.configSpreadsheetId || form.configSpreadsheetId);
      setNotice('Saved.');
    } catch (err) {
      setError(err.message || 'Could not save Google sheet details.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">Sheets</h2>
      {configHost ? (
        <p className="mb-4 text-xs text-slate-500">
          Config: <span className="font-mono">{configHost}</span>
        </p>
      ) : null}
      {error ? <p className="mb-3 rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}
      {notice ? <p className="mb-3 rounded bg-emerald-50 p-2 text-sm text-emerald-800">{notice}</p> : null}

      <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold">Configuration sheet</h3>
        <div className="mt-3 max-w-xl">
          <Field
            label="Spreadsheet ID"
            hint="Stores Sales, Training, and User spreadsheet IDs."
            value={form.configSpreadsheetId}
            onChange={(value) => setField('configSpreadsheetId', value)}
            placeholder="Configuration spreadsheet ID"
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold">Sales data</h3>
          <Field
            label="Google account"
            hint="Owner Gmail."
            value={form.salesAccount}
            onChange={(value) => setField('salesAccount', value)}
            placeholder="sales-owner@example.com"
          />
          <Field
            label="Spreadsheet ID"
            hint="ID or sheet URL."
            value={form.spreadsheetId}
            onChange={(value) => setField('spreadsheetId', value)}
            placeholder="Sales spreadsheet ID"
          />
        </div>

        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold">Training data</h3>
          <Field
            label="Google account"
            hint="Owner Gmail."
            value={form.trainingAccount}
            onChange={(value) => setField('trainingAccount', value)}
            placeholder="training-owner@example.com"
          />
          <Field
            label="Spreadsheet ID"
            hint="ID or sheet URL."
            value={form.trainingSpreadsheetId}
            onChange={(value) => setField('trainingSpreadsheetId', value)}
            placeholder="Training spreadsheet ID"
          />
        </div>

        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold">User details</h3>
          <Field
            label="Google account"
            hint="Owner Gmail."
            value={form.employeesAccount}
            onChange={(value) => setField('employeesAccount', value)}
            placeholder="Optional"
          />
          <Field
            label="Spreadsheet ID"
            hint="Users spreadsheet only."
            value={form.employeesSpreadsheetId}
            onChange={(value) => setField('employeesSpreadsheetId', value)}
            placeholder="User details spreadsheet ID"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={busy || !privileges.canManageSheets}
        className="mt-5 rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
      >
        {busy ? 'Saving…' : 'Save sheet details'}
      </button>
    </section>
  );
}

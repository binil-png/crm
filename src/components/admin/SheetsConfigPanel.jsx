import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { isDemoMode } from '../../services/googleApi';
import { getWorkbookConfig, loadWorkbookConfig } from '../../services/sheetsService';
import { useCrmStore } from '../../store/crmStore';
import { parseSpreadsheetId } from '../../utils/constants';

const emptyForm = {
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
        salesAccount: current.salesAccount || '',
        spreadsheetId: current.spreadsheetId || '',
        trainingAccount: current.trainingAccount || '',
        trainingSpreadsheetId: current.trainingSpreadsheetId || '',
        employeesAccount: current.employeesAccount || '',
        employeesSpreadsheetId: current.employeesSpreadsheetId || current.trainingSpreadsheetId || '',
      });
      setConfigHost(
        isDemoMode()
          ? 'Local demo Workbook_Config'
          : current.configSpreadsheetId || current.spreadsheetId || ''
      );
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
          salesAccount: form.salesAccount,
          spreadsheetId: parseSpreadsheetId(form.spreadsheetId),
          trainingAccount: form.trainingAccount,
          trainingSpreadsheetId: parseSpreadsheetId(form.trainingSpreadsheetId),
          employeesAccount: form.employeesAccount || form.trainingAccount,
          employeesSpreadsheetId: parseSpreadsheetId(form.employeesSpreadsheetId) || parseSpreadsheetId(form.trainingSpreadsheetId),
        },
        user?.email
      );
      setForm({
        salesAccount: next.salesAccount || '',
        spreadsheetId: next.spreadsheetId || '',
        trainingAccount: next.trainingAccount || '',
        trainingSpreadsheetId: next.trainingSpreadsheetId || '',
        employeesAccount: next.employeesAccount || '',
        employeesSpreadsheetId: next.employeesSpreadsheetId || '',
      });
      setNotice(
        'Sheet details saved to Workbook_Config. Share each spreadsheet with the signed-in admin, or with the CRM service account, as Editor.'
      );
    } catch (err) {
      setError(err.message || 'Could not save Google sheet details.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h2 className="text-lg font-semibold">Google sheets</h2>
      <p className="mb-4 text-sm text-slate-500">
        Sales, training, and employee details can live in spreadsheets owned by different Google accounts. Admin
        enters each spreadsheet ID here. Mappings are stored on the configured account sheet tab Workbook_Config.
        Employee / Users rows are written only to the employees spreadsheet.
      </p>
      {configHost ? (
        <p className="mb-4 text-xs text-slate-500">
          Config storage spreadsheet: <span className="font-mono">{configHost}</span>
        </p>
      ) : null}
      {error ? <p className="mb-3 rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}
      {notice ? <p className="mb-3 rounded bg-emerald-50 p-2 text-sm text-emerald-800">{notice}</p> : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold">Sales sheet</h3>
          <Field
            label="Google account"
            hint="Owner or editor Gmail for the sales workbook."
            value={form.salesAccount}
            onChange={(value) => setField('salesAccount', value)}
            placeholder="sales-owner@example.com"
          />
          <Field
            label="Spreadsheet ID"
            hint="Paste the ID or the full Google Sheets URL."
            value={form.spreadsheetId}
            onChange={(value) => setField('spreadsheetId', value)}
            placeholder="Leads and interaction history"
          />
        </div>

        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold">Training sheet</h3>
          <Field
            label="Google account"
            hint="Owner or editor Gmail for the training workbook."
            value={form.trainingAccount}
            onChange={(value) => setField('trainingAccount', value)}
            placeholder="training-owner@example.com"
          />
          <Field
            label="Spreadsheet ID"
            hint="Paste the ID or the full Google Sheets URL."
            value={form.trainingSpreadsheetId}
            onChange={(value) => setField('trainingSpreadsheetId', value)}
            placeholder="Training_Clients, Training_Sessions, work logs"
          />
        </div>

        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold">Employees sheet</h3>
          <Field
            label="Google account"
            hint="Employee details are saved on this account’s sheet."
            value={form.employeesAccount}
            onChange={(value) => setField('employeesAccount', value)}
            placeholder="Same as training if left blank"
          />
          <Field
            label="Spreadsheet ID"
            hint="Users tab is created here. Leave blank to use the training spreadsheet."
            value={form.employeesSpreadsheetId}
            onChange={(value) => setField('employeesSpreadsheetId', value)}
            placeholder="Users / employee details"
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

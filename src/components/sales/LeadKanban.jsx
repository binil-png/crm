import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCrmStore } from '../../store/crmStore';
import {
  LEAD_HEADERS,
  LEAD_SOURCES,
  LANGUAGES,
  PIPELINE_STATUSES,
  REGIONS,
  SPECIALIZATIONS,
  STATUS_GROUPS,
  findClientForLead,
  formatDdMmYyyy,
  leadKey,
  parseStageComments,
  pipelineColor,
} from '../../utils/constants';
import LeadModal from './LeadModal';
import SalesCloseModal from './SalesCloseModal';
import Modal from '../shared/Modal';

const PAGE_SIZE = 50;

export default function LeadKanban() {
  const { user } = useAuth();
  const { leads, leadSheets, createLead, clients } = useCrmStore();
  const [group, setGroup] = useState('All');
  const [status, setStatus] = useState('All');
  const [sheet, setSheet] = useState('All');
  const [source, setSource] = useState('All');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);
  const [closing, setClosing] = useState(null);
  const [creating, setCreating] = useState(false);

  const executives = useMemo(
    () => [...new Set(leads.map((lead) => lead.Executive).filter(Boolean))],
    [leads]
  );
  const sources = useMemo(
    () => [...new Set(leads.map((lead) => lead.Source).filter(Boolean))].sort(),
    [leads]
  );

  const visible = useMemo(() => {
    const groupStatuses = STATUS_GROUPS[group] || PIPELINE_STATUSES;
    const needle = query.trim().toLowerCase();
    return leads.filter((lead) => {
      if (sheet !== 'All' && lead._sheet !== sheet) return false;
      if (status !== 'All' && lead.Status !== status) return false;
      if (group !== 'All' && !groupStatuses.includes(lead.Status)) return false;
      if (source !== 'All' && lead.Source !== source) return false;
      if (!needle) return true;
      return [lead['Customer Name'], lead['Email ID'], lead['Contact Number'], lead.Comments, lead.Executive]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [leads, group, status, sheet, source, query]);

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  const rows = visible.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Sales leads</h2>
          <p className="text-sm text-slate-500">
            {visible.length} of {leads.length} rows · columns match the Google Sheet
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1 rounded bg-slate-900 px-3 py-2 text-sm text-white"
        >
          <Plus size={16} />
          Add lead
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {Object.keys(STATUS_GROUPS).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setGroup(key);
              setStatus('All');
              setPage(0);
            }}
            className={`rounded px-3 py-1 text-sm ${group === key ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white'}`}
          >
            {key}
          </button>
        ))}
      </div>

      <div className="mb-3 grid gap-2 md:grid-cols-4">
        <input
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          placeholder="Search name, phone, email, comments"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
        />
        <select
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          value={sheet}
          onChange={(e) => {
            setSheet(e.target.value);
            setPage(0);
          }}
        >
          <option value="All">All sheets</option>
          {leadSheets.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
        <select
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
        >
          <option>All</option>
          {PIPELINE_STATUSES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          className="rounded border border-slate-300 px-3 py-2 text-sm"
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setPage(0);
          }}
        >
          <option>All</option>
          {sources.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>

      <div className="max-h-[70vh] overflow-auto rounded border border-slate-300 bg-white">
        <table className="min-w-[1400px] w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="border border-slate-300 px-2 py-2">Sheet</th>
              {LEAD_HEADERS.map((header) => (
                <th key={header} className="whitespace-nowrap border border-slate-300 px-2 py-2">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((lead) => {
              const comments = parseStageComments(lead.Comments);
              const stages = comments.length ? comments : [{ raw: '—', num: 0, message: '' }];
              const span = stages.length;
              const trainingClient = findClientForLead(clients, lead);
              return stages.map((comment, index) => (
                <tr
                  key={`${leadKey(lead)}-${comment.num || index}`}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => setSelected(lead)}
                >
                  {index === 0
                    ? ['Sheet', ...LEAD_HEADERS].map((header) =>
                        header === 'Comments' ? (
                          <td key={`${leadKey(lead)}-c-${index}`} className="min-w-[280px] max-w-[420px] whitespace-pre-wrap border border-slate-300 px-2 py-2 align-top">
                            {comment.raw}
                          </td>
                        ) : (
                          <td
                            key={header}
                            rowSpan={span}
                            className="max-w-[200px] border border-slate-300 px-2 py-2 align-top"
                          >
                            {header === 'Sheet' ? (
                              <span className="text-xs text-slate-500">{lead._sheet}</span>
                            ) : header === 'Status' ? (
                              <div>
                                <span className={`rounded px-2 py-0.5 text-xs ${pipelineColor(lead.Status)}`}>{lead.Status}</span>
                                {trainingClient ? (
                                  <p className="mt-1 text-[11px] text-sky-700">
                                    Passed to training
                                    {trainingClient.Training_Status ? ` · ${trainingClient.Training_Status}` : ''}
                                  </p>
                                ) : null}
                              </div>
                            ) : (
                              String(lead[header] || '—')
                            )}
                          </td>
                        )
                      )
                    : (
                      <td className="min-w-[280px] max-w-[420px] whitespace-pre-wrap border border-slate-300 px-2 py-2 align-top">
                        {comment.raw}
                      </td>
                    )}
                </tr>
              ));
            })}
            {rows.length === 0 ? (
              <tr>
                <td className="border border-slate-300 px-3 py-6 text-slate-500" colSpan={LEAD_HEADERS.length + 1}>
                  No leads match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <p className="text-slate-500">
          Page {currentPage + 1} of {pages}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40"
            disabled={currentPage === 0}
            onClick={() => setPage((n) => Math.max(0, n - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40"
            disabled={currentPage >= pages - 1}
            onClick={() => setPage((n) => n + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {creating ? (
        <CreateLeadModal
          user={user}
          leadSheets={leadSheets}
          executives={executives}
          onClose={() => setCreating(false)}
          onCreate={async (payload) => {
            await createLead(payload);
            setCreating(false);
          }}
        />
      ) : null}

      {selected ? (
        <LeadModal
          lead={selected}
          onClose={() => setSelected(null)}
          onCloseDeal={(lead) => {
            setSelected(null);
            setClosing(lead);
          }}
        />
      ) : null}

      {closing ? <SalesCloseModal lead={closing} onClose={() => setClosing(null)} /> : null}
    </section>
  );
}

function CreateLeadModal({ user, leadSheets, executives, onClose, onCreate }) {
  const defaultSheet = leadSheets[0] || 'ANWAR';
  const [form, setForm] = useState({
    _sheet: defaultSheet,
    Executive: executives[0] || user?.name || '',
    Date: formatDdMmYyyy(new Date()),
    'Customer Name': '',
    'Email ID': '',
    'Contact Number': '',
    Source: 'Online leads',
    'Source(Remarks)': '',
    Country: '',
    State: '',
    Language: '',
    City: '',
    Specialization: '',
    Region: 'Domestic',
    Status: 'New',
    Comments: '',
    'Scheduled Date': '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!form['Customer Name'].trim()) {
      setError('Customer Name is required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onCreate(form);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal title="Add lead" onClose={onClose} wide>
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
        {error ? <p className="md:col-span-2 rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</p> : null}
        <label className="text-sm">
          Sheet
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={form._sheet}
            onChange={(e) => setForm((prev) => ({ ...prev, _sheet: e.target.value }))}
          >
            {leadSheets.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Executive
          <input
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={form.Executive}
            onChange={(e) => setForm((prev) => ({ ...prev, Executive: e.target.value }))}
          />
        </label>
        <label className="text-sm md:col-span-2">
          Customer Name
          <input
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={form['Customer Name']}
            onChange={(e) => setForm((prev) => ({ ...prev, 'Customer Name': e.target.value }))}
            required
          />
        </label>
        <label className="text-sm">
          Email ID
          <input
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={form['Email ID']}
            onChange={(e) => setForm((prev) => ({ ...prev, 'Email ID': e.target.value }))}
          />
        </label>
        <label className="text-sm">
          Contact Number
          <input
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={form['Contact Number']}
            onChange={(e) => setForm((prev) => ({ ...prev, 'Contact Number': e.target.value }))}
          />
        </label>
        <label className="text-sm">
          Source
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={form.Source}
            onChange={(e) => setForm((prev) => ({ ...prev, Source: e.target.value }))}
          >
            {LEAD_SOURCES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Source(Remarks)
          <input
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={form['Source(Remarks)']}
            onChange={(e) => setForm((prev) => ({ ...prev, 'Source(Remarks)': e.target.value }))}
          />
        </label>
        <label className="text-sm">
          State
          <input
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={form.State}
            onChange={(e) => setForm((prev) => ({ ...prev, State: e.target.value }))}
          />
        </label>
        <label className="text-sm">
          City
          <input
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={form.City}
            onChange={(e) => setForm((prev) => ({ ...prev, City: e.target.value }))}
          />
        </label>
        <label className="text-sm">
          Specialization
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={form.Specialization}
            onChange={(e) => setForm((prev) => ({ ...prev, Specialization: e.target.value }))}
          >
            <option value=""></option>
            {SPECIALIZATIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Language
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={form.Language}
            onChange={(e) => setForm((prev) => ({ ...prev, Language: e.target.value }))}
          >
            <option value=""></option>
            {LANGUAGES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Region
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={form.Region}
            onChange={(e) => setForm((prev) => ({ ...prev, Region: e.target.value }))}
          >
            {REGIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Country
          <input
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={form.Country}
            onChange={(e) => setForm((prev) => ({ ...prev, Country: e.target.value }))}
          />
        </label>
        <button type="submit" disabled={busy} className="md:col-span-2 rounded bg-slate-900 px-4 py-2 text-white">
          {busy ? 'Saving…' : 'Create lead'}
        </button>
      </form>
    </Modal>
  );
}

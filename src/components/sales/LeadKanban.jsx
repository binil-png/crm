import { useMemo, useRef, useState } from 'react';
import { Check, GripVertical, PanelRight, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCrmStore } from '../../store/crmStore';
import useNow from '../../hooks/useNow';
import {
  LEAD_HEADERS,
  LEAD_SOURCES,
  LANGUAGES,
  PIPELINE_STATUSES,
  REGIONS,
  SPECIALIZATIONS,
  STATUS_GROUPS,
  appendStageComment,
  findClientForLead,
  formatDdMmYyyy,
  formatDdMmYyyyHm,
  formatScheduleRelative,
  getCallScheduleState,
  getLeadScheduleAt,
  isCompletedLead,
  leadKey,
  normalizeTrainingStatus,
  parseSheetDate,
  parseStageComments,
  pipelineColor,
  setCompletedLeadDrag,
} from '../../utils/constants';
import LeadModal from './LeadModal';
import SalesCloseModal from './SalesCloseModal';
import CallAlerts from './CallAlerts';
import CallScheduleSidebar from './CallScheduleSidebar';
import TrainingDropBox from './TrainingDropBox';
import SalesTrainingProgress from './SalesTrainingProgress';
import ScheduleDateTimeFields from './ScheduleDateTimeFields';
import Modal from '../shared/Modal';
import Drawer from '../shared/Drawer';

const PAGE_SIZE = 50;

export default function LeadKanban() {
  const { user, privileges } = useAuth();
  const { leads, leadSheets, createLead, clients, updateLead, scheduleCall, completeCall } = useCrmStore();
  const now = useNow(15000);
  const [group, setGroup] = useState('All');
  const [status, setStatus] = useState('All');
  const [sheet, setSheet] = useState('All');
  const [source, setSource] = useState('All');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);
  const [commentsLead, setCommentsLead] = useState(null);
  const [closing, setClosing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [statusBusy, setStatusBusy] = useState('');
  const [tableError, setTableError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const skipRowClick = useRef(false);

  const latestLead = (lead) => leads.find((item) => leadKey(item) === leadKey(lead)) || lead;

  const openLead = (lead) => {
    setCommentsLead(null);
    setSelected(lead);
  };

  const openComments = (event, lead) => {
    event.stopPropagation();
    setSelected(null);
    setCommentsLead(lead);
  };

  const markCallDone = async (lead) => {
    if (!privileges.canEditLead) return;
    skipRowClick.current = true;
    setTableError('');
    try {
      const saved = await completeCall(lead);
      setSelected((current) => (current && leadKey(current) === leadKey(saved) ? saved : current));
    } catch (err) {
      setTableError(err.message || 'Could not update the call.');
    }
  };

  const changeStatus = async (lead, nextStatus) => {
    if (!privileges.canEditLead) return;
    if (!nextStatus || nextStatus === lead.Status) return;
    skipRowClick.current = true;
    setStatusBusy(leadKey(lead));
    setTableError('');
    try {
      const saved = await updateLead(lead, {
        Status: nextStatus,
        Comments: appendStageComment(lead.Comments, `Status changed to ${nextStatus}`),
      });
      setSelected((current) => (current && leadKey(current) === leadKey(saved) ? saved : current));
      setCommentsLead((current) => (current && leadKey(current) === leadKey(saved) ? saved : current));
    } catch (err) {
      setTableError(err.message || 'Could not update status.');
    } finally {
      setStatusBusy('');
    }
  };

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
  const overdueCount = useMemo(
    () => leads.filter((lead) => getCallScheduleState(lead, now) === 'overdue').length,
    [leads, now]
  );
  const readyToPassCount = useMemo(
    () =>
      privileges.canPassToTraining
        ? leads.filter((lead) => isCompletedLead(lead) && !findClientForLead(clients, lead)).length
        : 0,
    [leads, clients, privileges.canPassToTraining]
  );

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Sales leads</h2>
          <p className="text-sm text-slate-500">
            {visible.length} of {leads.length} rows · columns match the Google Sheet
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {privileges.canAddLead ? (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1 rounded bg-slate-900 px-3 py-2 text-sm text-white"
            >
              <Plus size={16} />
              Add lead
            </button>
          ) : null}
        </div>
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
        <label className="text-xs font-medium text-slate-600">
          Search
          <input
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800"
            placeholder="Search name, phone, email, comments"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <label className="text-xs font-medium text-slate-600">
          Sheet
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800"
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
        </label>
        <label className="text-xs font-medium text-slate-600">
          Status
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="All">All statuses</option>
            {PIPELINE_STATUSES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          Source
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800"
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setPage(0);
            }}
          >
            <option value="All">All sources</option>
            {sources.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>

      <CallAlerts leads={leads} now={now} onSelect={openLead} />
      {tableError ? <p className="mb-3 rounded bg-rose-50 p-2 text-sm text-rose-700">{tableError}</p> : null}

      <div className="min-w-0">
      <div className="max-h-[calc(100vh-13rem)] overflow-auto rounded border border-slate-300 bg-white">
        <table className="min-w-[1400px] w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="w-8 border border-slate-300 px-1 py-2" title="Drag completed leads to training" />
              <th className="border border-slate-300 px-2 py-2">Sheet</th>
              {LEAD_HEADERS.map((header) => (
                <th key={header} className="whitespace-nowrap border border-slate-300 px-2 py-2">
                  {header === 'Scheduled Date' ? 'Scheduled Date / Time' : header}
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
              const canPass = privileges.canPassToTraining && isCompletedLead(lead) && !trainingClient;
              return stages.map((comment, index) => (
                <tr
                  key={`${leadKey(lead)}-${comment.num || index}`}
                  className={`hover:bg-slate-50 ${canPass ? 'bg-emerald-50/60' : 'cursor-pointer'}`}
                  onClick={() => {
                    if (skipRowClick.current) {
                      skipRowClick.current = false;
                      return;
                    }
                    openLead(lead);
                  }}
                >
                  {index === 0
                    ? ['Pass', 'Sheet', ...LEAD_HEADERS].map((header) =>
                        header === 'Pass' ? (
                          <td
                            key="Pass"
                            rowSpan={span}
                            className="w-8 border border-slate-300 px-1 py-2 align-top"
                          >
                            {canPass ? (
                              <span
                                draggable
                                title="Drag this completed lead to training"
                                className="inline-flex cursor-grab rounded p-0.5 text-emerald-700 active:cursor-grabbing"
                                onClick={(event) => event.stopPropagation()}
                                onDragStart={(event) => {
                                  skipRowClick.current = true;
                                  setCompletedLeadDrag(event, lead);
                                  setDrawerOpen(true);
                                }}
                              >
                                <GripVertical size={16} />
                              </span>
                            ) : null}
                          </td>
                        ) : header === 'Comments' ? (
                          <CommentCell
                            key={`${leadKey(lead)}-c-${index}`}
                            comment={comment}
                            onOpen={(event) => openComments(event, lead)}
                          />
                        ) : (
                          <td
                            key={header}
                            rowSpan={span}
                            className="max-w-[200px] border border-slate-300 px-2 py-2 align-top"
                          >
                            {header === 'Sheet' ? (
                              <span className="text-xs text-slate-500">{lead._sheet}</span>
                            ) : header === 'Scheduled Date' ? (
                              <ScheduleStamp
                                lead={lead}
                                now={now}
                                canEdit={privileges.canEditLead}
                                onComplete={markCallDone}
                              />
                            ) : header === 'Status' ? (
                              <StatusSelect
                                lead={lead}
                                busy={statusBusy === leadKey(lead)}
                                trainingClient={trainingClient}
                                canPass={canPass}
                                readOnly={!privileges.canEditLead}
                                onChange={changeStatus}
                              />
                            ) : (
                              String(lead[header] || '—')
                            )}
                          </td>
                        )
                      )
                    : (
                      <CommentCell comment={comment} onOpen={(event) => openComments(event, lead)} />
                    )}
                </tr>
              ));
            })}
            {rows.length === 0 ? (
              <tr>
                <td className="border border-slate-300 px-3 py-6 text-slate-500" colSpan={LEAD_HEADERS.length + 2}>
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
      </div>

      <Drawer
        title="Call schedules and training"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpen={() => setDrawerOpen(true)}
        wide
        edgeLabel="Call schedules and training"
        edgeBadge={overdueCount + readyToPassCount}
      >
        <div className="mb-4">
          <SalesTrainingProgress ribbon />
        </div>
        <div className="grid items-start gap-4 md:grid-cols-2">
          {privileges.canPassToTraining ? <TrainingDropBox leads={leads} /> : null}
          <CallScheduleSidebar
            leads={leads}
            now={now}
            onSelect={(lead) => {
              setDrawerOpen(false);
              openLead(lead);
            }}
            canEdit={privileges.canEditLead}
            onCompleteCall={markCallDone}
            onChangeStatus={changeStatus}
          />
        </div>
      </Drawer>

      {creating ? (
        <CreateLeadModal
          user={user}
          leadSheets={leadSheets}
          executives={executives}
          onClose={() => setCreating(false)}
          onCreate={async (payload) => {
            const { callMinutes, ...leadPayload } = payload;
            const lead = await createLead({
              ...leadPayload,
              Comments: leadPayload.Comments ? appendStageComment('', leadPayload.Comments) : '',
            });
            const start = parseSheetDate(leadPayload['Scheduled Date']);
            if (start) {
              await scheduleCall(lead, {
                start,
                end: new Date(start.getTime() + (Number(callMinutes) || 30) * 60 * 1000),
                note: `Call scheduled for ${formatDdMmYyyyHm(start)}`,
              });
            }
            setCreating(false);
          }}
        />
      ) : null}

      {selected ? (
        <LeadModal
          lead={latestLead(selected)}
          onClose={() => setSelected(null)}
          onCloseDeal={(lead) => {
            setSelected(null);
            setClosing(lead);
          }}
        />
      ) : null}

      {commentsLead ? (
        <LeadModal
          lead={latestLead(commentsLead)}
          mode="comments"
          onClose={() => setCommentsLead(null)}
        />
      ) : null}

      {closing ? <SalesCloseModal lead={closing} onClose={() => setClosing(null)} /> : null}
    </section>
  );
}

function CommentCell({ comment, onOpen }) {
  return (
    <td
      className="min-w-[280px] max-w-[420px] cursor-pointer whitespace-pre-wrap border border-slate-300 px-2 py-2 align-top hover:bg-sky-50"
      title="View comments"
      onClick={onOpen}
    >
      {comment.raw}
    </td>
  );
}

function StatusSelect({ lead, busy, trainingClient, canPass, readOnly, onChange }) {
  const current = lead.Status || 'New';
  const options = PIPELINE_STATUSES.includes(current) ? PIPELINE_STATUSES : [current, ...PIPELINE_STATUSES];
  return (
    <div
      className="min-w-[160px]"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <select
        disabled={busy || readOnly}
        className={`w-full max-w-[190px] rounded border border-slate-200 px-1.5 py-1 text-xs ${pipelineColor(current)}`}
        value={current}
        onChange={(event) => onChange(lead, event.target.value)}
      >
        {options.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      {trainingClient ? (
        <p className="mt-1 text-[11px] text-sky-700">
          Passed to training
          {trainingClient.Training_Status ? ` · ${normalizeTrainingStatus(trainingClient.Training_Status)}` : ''}
        </p>
      ) : canPass ? (
        <p className="mt-1 text-[11px] text-emerald-700">Drag the handle to training</p>
      ) : null}
    </div>
  );
}

function ScheduleStamp({ lead, now, canEdit, onComplete }) {
  const at = getLeadScheduleAt(lead);
  const state = getCallScheduleState(lead, now);
  if (!lead['Scheduled Date']) return '—';
  return (
    <div>
      <p>{at ? formatDdMmYyyy(at) : lead['Scheduled Date']}</p>
      {at ? <p className="text-xs font-medium text-slate-700">{at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p> : null}
      {state === 'overdue' ? (
        <div className="mt-1">
          <p className="text-[11px] font-medium text-rose-700">Overdue · {formatScheduleRelative(at, now)}</p>
          {canEdit ? (
            <button
              type="button"
              className="mt-1 inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-0.5 text-[11px] font-medium text-white"
              onClick={(event) => {
                event.stopPropagation();
                onComplete?.(lead);
              }}
            >
              <Check size={11} />
              Mark call done
            </button>
          ) : null}
        </div>
      ) : null}
      {state === 'soon' ? (
        <p className="mt-1 text-[11px] font-medium text-amber-700">Starts {formatScheduleRelative(at, now)}</p>
      ) : null}
      {state === 'upcoming' ? (
        <p className="mt-1 text-[11px] text-sky-700">{formatScheduleRelative(at, now)}</p>
      ) : null}
    </div>
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
    callMinutes: 30,
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
        <label className="text-sm">
          Status
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={form.Status}
            onChange={(e) => setForm((prev) => ({ ...prev, Status: e.target.value }))}
          >
            {PIPELINE_STATUSES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Call duration
          <select
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={form.callMinutes}
            onChange={(e) => setForm((prev) => ({ ...prev, callMinutes: Number(e.target.value) }))}
          >
            {[15, 30, 45, 60].map((item) => (
              <option key={item} value={item}>
                {item} min
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm md:col-span-2">
          Comments
          <textarea
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            rows={3}
            value={form.Comments}
            onChange={(e) => setForm((prev) => ({ ...prev, Comments: e.target.value }))}
            placeholder="Add an opening comment"
          />
        </label>
        <div className="md:col-span-2 rounded border border-slate-200 p-3">
          <p className="mb-2 text-sm font-medium">Schedule call</p>
          <ScheduleDateTimeFields
            value={form['Scheduled Date']}
            onChange={(next) => setForm((prev) => ({ ...prev, 'Scheduled Date': next }))}
            dateLabel="Call date"
            timeLabel="Call time"
          />
        </div>
        <button type="submit" disabled={busy} className="md:col-span-2 rounded bg-slate-900 px-4 py-2 text-white">
          {busy ? 'Saving…' : 'Create lead'}
        </button>
      </form>
    </Modal>
  );
}

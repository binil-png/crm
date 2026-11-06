import { create } from 'zustand';
import * as sheets from '../services/sheetsService';
import { createCalendarEvent, patchCalendarEvent } from '../services/calendarService';
import {
  appendStageComment,
  createId,
  formatDdMmYyyy,
  formatDdMmYyyyHm,
  leadKey,
  nowIso,
  findClientForLead,
  todayInput,
  trainingLeadId,
} from '../utils/constants';

const replaceLead = (leads, next) =>
  leads.map((lead) => (leadKey(lead) === leadKey(next) ? next : lead));

let refreshPromise = null;

export const useCrmStore = create((set, get) => ({
  leads: [],
  leadSheets: [],
  clients: [],
  sessions: [],
  messages: [],
  worklogs: [],
  loading: false,
  syncing: false,
  lastSyncedAt: 0,
  error: '',

  setError: (error) => set({ error }),

  refreshAll: async ({ silent = false } = {}) => {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
      if (silent) set({ syncing: true });
      else set({ loading: true, error: '' });
      try {
        const [leads, leadSheets, clients, sessions, messages, worklogs] = await Promise.all([
          sheets.getLeads(),
          sheets.getLeadSheets(),
          sheets.getClients(),
          sheets.getSessions(),
          sheets.getMessages(),
          sheets.getWorklogs(),
        ]);
        set({
          leads,
          leadSheets,
          clients,
          sessions,
          messages,
          worklogs,
          loading: false,
          syncing: false,
          lastSyncedAt: Date.now(),
          error: silent ? get().error : '',
        });
      } catch (error) {
        if (silent) {
          set({ syncing: false });
          return;
        }
        set({ loading: false, syncing: false, error: error.message || 'Failed to load CRM data.' });
        throw error;
      }
    })().finally(() => {
      refreshPromise = null;
    });

    return refreshPromise;
  },

  createLead: async (payload) => {
    const lead = await sheets.addLead({
      Executive: payload.Executive,
      Date: payload.Date || formatDdMmYyyy(new Date()),
      'Customer Name': payload['Customer Name'],
      'Email ID': payload['Email ID'] || '',
      'Contact Number': payload['Contact Number'] || '',
      Source: payload.Source || 'Online leads',
      'Source(Remarks)': payload['Source(Remarks)'] || '',
      Country: payload.Country || '',
      State: payload.State || '',
      Language: payload.Language || '',
      City: payload.City || '',
      Specialization: payload.Specialization || '',
      Region: payload.Region || 'Domestic',
      Status: payload.Status || 'New',
      Comments: payload.Comments || '',
      'Scheduled Date': payload['Scheduled Date'] || '',
      _sheet: payload._sheet || String(payload.Executive || '').trim().toUpperCase(),
    });
    const leads = await sheets.getLeads();
    set({ leads });
    return lead;
  },

  updateLead: async (lead, patch) => {
    const next = await sheets.updateLead(lead, patch);
    set({ leads: replaceLead(get().leads, next) });
    return next;
  },

  scheduleCall: async (lead, { start, end, note }) => {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date(startDate.getTime() + 30 * 60 * 1000);
    try {
      await createCalendarEvent({
        title: `Call - ${lead['Customer Name']}`,
        start: startDate,
        end: endDate,
        attendees: [lead['Email ID']].filter(Boolean).join(','),
        description: note || `Sales call with ${lead['Customer Name']}`,
      });
    } catch (error) {
      console.warn(error);
    }
    const scheduled = formatDdMmYyyyHm(startDate);
    const comments = appendStageComment(lead.Comments, note || `Call scheduled for ${scheduled}`);
    return get().updateLead(lead, { 'Scheduled Date': scheduled, Comments: comments });
  },

  closeLead: async (lead, { outcome, comment, passToTraining = false }) => {
    const comments = comment ? appendStageComment(lead.Comments, comment) : lead.Comments;
    const updated = await sheets.updateLead(lead, { Status: outcome, Comments: comments });
    set({ leads: replaceLead(get().leads, updated) });
    let client = null;
    if (passToTraining && outcome === 'Demo Done-Closed') {
      client = await get().passToTraining(updated);
    }
    return { lead: updated, client };
  },

  passToTraining: async (lead) => {
    const existing = findClientForLead(get().clients, lead);
    if (existing) return existing;

    const client = {
      Client_ID: createId('CL'),
      Lead_ID: trainingLeadId(lead),
      Client_Name: lead['Customer Name'],
      Contact_Email: lead['Email ID'] || '',
      Assigned_Trainer: '',
      Training_Status: 'Pending Assignment',
      Completed_Date: '',
    };
    await sheets.addClient(client);
    const comments = appendStageComment(lead.Comments, 'Passed to training team');
    const nextLead = await sheets.updateLead(lead, { Comments: comments });
    set({
      clients: [client, ...get().clients],
      leads: replaceLead(get().leads, nextLead),
    });
    return client;
  },

  pickClient: async (clientId, trainerEmail) => {
    const next = await sheets.updateClient(clientId, {
      Assigned_Trainer: trainerEmail,
      Training_Status: 'In Progress',
    });
    set({ clients: get().clients.map((client) => (client.Client_ID === clientId ? next : client)) });
    return next;
  },

  assignTrainer: async (clientId, trainerEmail) => {
    const next = await sheets.updateClient(clientId, { Assigned_Trainer: trainerEmail });
    set({ clients: get().clients.map((client) => (client.Client_ID === clientId ? next : client)) });
    return next;
  },

  updateClient: async (clientId, patch) => {
    const next = await sheets.updateClient(clientId, patch);
    set({ clients: get().clients.map((client) => (client.Client_ID === clientId ? next : client)) });
    return next;
  },

  scheduleSessions: async ({ client, trainerEmail, sessions }) => {
    const created = [];
    for (const item of sessions) {
      const attendees = [client.Contact_Email, trainerEmail].filter(Boolean).join(',');
      const event = await createCalendarEvent({
        title: item.title,
        start: item.start,
        end: item.end,
        attendees,
        description: `Training session for ${client.Client_Name}`,
      });
      const session = {
        Session_ID: createId('SS'),
        Client_ID: client.Client_ID,
        Calendar_Event_ID: event.id || '',
        Session_Title: item.title,
        Start_Time: new Date(item.start).toISOString(),
        End_Time: new Date(item.end).toISOString(),
        Trainer_Email: trainerEmail,
        Status: 'Scheduled',
        Meet_Link: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri || '',
      };
      await sheets.addSession(session);
      created.push(session);
    }

    const clientPatch = {
      Assigned_Trainer: trainerEmail,
      Training_Status: client.Training_Status === 'Completed' ? 'Completed' : 'In Progress',
    };
    const nextClient = await sheets.updateClient(client.Client_ID, clientPatch);
    set({
      sessions: [...created, ...get().sessions],
      clients: get().clients.map((item) => (item.Client_ID === client.Client_ID ? nextClient : item)),
    });
    return created;
  },

  updateSession: async (sessionId, patch) => {
    const next = await sheets.updateSession(sessionId, patch);
    const sessions = get().sessions.map((session) => (session.Session_ID === sessionId ? next : session));
    set({ sessions });
    await get().maybeCompleteTraining(next.Client_ID, sessions);
    return next;
  },

  rescheduleSession: async (session, start, end) => {
    const nextStart = new Date(start);
    const nextEnd = new Date(end);
    if (session.Calendar_Event_ID) {
      try {
        await patchCalendarEvent(session.Calendar_Event_ID, { start: nextStart, end: nextEnd });
      } catch (error) {
        console.warn(error);
      }
    }
    return get().updateSession(session.Session_ID, {
      Start_Time: nextStart.toISOString(),
      End_Time: nextEnd.toISOString(),
      Status: session.Status === 'Completed' || session.Status === 'Cancelled' ? session.Status : 'Rescheduled',
    });
  },

  completeSession: async (session) => {
    return get().updateSession(session.Session_ID, { Status: 'Completed' });
  },

  maybeCompleteTraining: async (clientId, sessions = get().sessions) => {
    const related = sessions.filter((session) => session.Client_ID === clientId);
    if (!related.length) return;
    const allDone = related.every((session) => session.Status === 'Completed' || session.Status === 'Cancelled');
    if (!allDone) return;
    const client = get().clients.find((item) => item.Client_ID === clientId);
    if (!client || client.Training_Status === 'Completed') return;
    await get().updateClient(clientId, {
      Training_Status: 'Completed',
      Completed_Date: todayInput(),
    });
  },

  addMessage: async (payload) => {
    const message = {
      Timestamp: nowIso(),
      'Sheet Name': payload['Sheet Name'] || payload.sheetName || '',
      'Client Name': payload['Client Name'] || payload.clientName || '',
      Executive: payload.Executive || '',
      Channel: payload.Channel || payload.Message_Type || 'Comment',
      Notes: payload.Notes || payload.Content || '',
      'Scheduled Date': payload['Scheduled Date'] || '',
    };
    await sheets.addMessage(message);
    set({ messages: [message, ...get().messages] });
    return message;
  },

  addWorklog: async (payload) => {
    const log = {
      Log_ID: createId('WL'),
      User_Email: payload.User_Email,
      Date: payload.Date || todayInput(),
      Entry_Type: payload.Entry_Type,
      Work_Summary: payload.Work_Summary || '',
      Leave_Reason: payload.Leave_Reason || '',
      Rescheduled_Sessions: payload.Rescheduled_Sessions || '',
    };
    await sheets.addWorklog(log);
    set({ worklogs: [log, ...get().worklogs] });
    return log;
  },

  applyLeaveAndReschedule: async ({ userEmail, date, reason, updates }) => {
    const details = [];
    for (const item of updates) {
      if (item.Calendar_Event_ID) {
        await patchCalendarEvent(item.Calendar_Event_ID, {
          start: item.newStart,
          end: item.newEnd,
        });
      }
      const next = await sheets.updateSession(item.Session_ID, {
        Start_Time: new Date(item.newStart).toISOString(),
        End_Time: new Date(item.newEnd).toISOString(),
        Status: 'Rescheduled',
      });
      details.push({
        Session_ID: item.Session_ID,
        Session_Title: item.Session_Title,
        Old_Start: item.Start_Time,
        New_Start: next.Start_Time,
        New_End: next.End_Time,
      });
    }

    const sessions = get().sessions.map((session) => {
      const changed = details.find((item) => item.Session_ID === session.Session_ID);
      if (!changed) return session;
      return {
        ...session,
        Start_Time: changed.New_Start,
        End_Time: changed.New_End,
        Status: 'Rescheduled',
      };
    });

    const log = await get().addWorklog({
      User_Email: userEmail,
      Date: date,
      Entry_Type: 'Leave',
      Work_Summary: '',
      Leave_Reason: reason,
      Rescheduled_Sessions: JSON.stringify(details),
    });

    set({ sessions });
    return log;
  },
}));

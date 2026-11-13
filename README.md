# Sheets CRM

Serverless React CRM that stores data in Google Sheets and schedules training in Google Calendar. There is no backend.

## Stack

- React + Vite
- Tailwind CSS
- Lucide icons
- `@react-oauth/google` + `gapi-script`
- Google Sheets API v4
- Google Calendar API v3

## Google Cloud setup

1. Create a Google Cloud project.
2. Enable **Google Sheets API**, **Google Calendar API**, and **Google Drive API**.
   Drive is used only to read the spreadsheet’s `modifiedTime`, so background sync does not burn Sheets read quota. There is no Sheets webhook to the browser; Drive push notifications would need a public HTTPS server.
3. Create an OAuth 2.0 Client ID (Web application).
4. Add `http://localhost:5173` to Authorized JavaScript origins.
5. Create **two** Google Spreadsheets and share both with the Google accounts that will sign in:
   - **Sales workbook** — leads and interaction history
   - **Training workbook** — `Training_Clients`, `Training_Sessions`, `Users`, and `Daily_Worklogs_Leaves`
6. Copy each spreadsheet ID from the sheet URL: `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`

On first login the app creates missing tabs:

- Sales workbook: lead tabs, `Settings`, `Interaction History`, `Audit Log`
- Training workbook: `Training_Clients`, `Training_Sessions`, `Users`, `Daily_Worklogs_Leaves`

## Run locally

```bash
npm install
npm run dev
```

Paste the Client ID and Spreadsheet ID on the setup screen, or put them in `.env`:

```bash
VITE_GOOGLE_CLIENT_ID=
VITE_GOOGLE_API_KEY=
VITE_GOOGLE_SPREADSHEET_ID=
VITE_GOOGLE_TRAINING_SPREADSHEET_ID=
VITE_GOOGLE_CALENDAR_ID=primary
```

## Web push (after the tab is closed)

In-app banners only work while the CRM is open. Closed-app alerts use **OneSignal** web push (FCM on Chrome/Edge, standard Web Push on Firefox/Safari).

1. Create a free app at [onesignal.com](https://onesignal.com).
2. Add the **Web** platform. Site URL: `http://localhost:5173` (plus your production origin).
3. Put the values in `.env`:

```bash
VITE_ONESIGNAL_APP_ID=
ONESIGNAL_APP_ID=
ONESIGNAL_REST_API_KEY=
# Optional. Defaults to /api/push during npm run dev.
VITE_PUSH_API_URL=
```

`ONESIGNAL_REST_API_KEY` is server-only. Do not prefix it with `VITE_`. Local Vite exposes `POST /api/push` so reminders can be scheduled without putting that key in the browser. For production, deploy `api/send-push.js` and set `VITE_PUSH_API_URL` to that URL.

After sign-in, click **Enable alerts** in the header, then schedule a call or training session. OneSignal delivers a notification 5 minutes before and at start time even if the CRM tab is closed.

Use **local demo mode** if you want to try the workflows without Google credentials. Demo data stays in `localStorage`.

## Roles

The top bar toggles:

- **Sales Executive** — pipeline, demos, deal close
- **Technical / Training Member** — onboarding, session scheduling, work logs, leave reschedule

Closed Won automatically appends a row to `Training_Clients`. Leave on a training day patches Calendar events and marks sessions as Rescheduled.

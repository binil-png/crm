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
2. Enable **Google Sheets API** and **Google Calendar API**.
3. Create an OAuth 2.0 Client ID (Web application).
4. Add `http://localhost:5173` to Authorized JavaScript origins.
5. Create or copy a Google Spreadsheet and share it with the Google account you will use to sign in.
6. Copy the spreadsheet ID from the sheet URL: `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`

On first login the app creates these tabs if they are missing:

- `Leads_Sales`
- `Training_Clients`
- `Training_Sessions`
- `Communication_Escalations`
- `Daily_Worklogs_Leaves`

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
```

Use **local demo mode** if you want to try the workflows without Google credentials. Demo data stays in `localStorage`.

## Roles

The top bar toggles:

- **Sales Executive** — pipeline, demos, deal close
- **Technical / Training Member** — onboarding, session scheduling, work logs, leave reschedule

Closed Won automatically appends a row to `Training_Clients`. Leave on a training day patches Calendar events and marks sessions as Rescheduled.

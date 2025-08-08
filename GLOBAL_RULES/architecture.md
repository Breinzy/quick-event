email-to-calendar/
├── public/
│   └── assets/                   # Static files like logo or UI images
├── src/
│   ├── app/                      # Next.js app directory (routes, layouts, etc.)
│   │   ├── page.tsx             # Main UI for pasting email + submitting
│   │   └── api/
│   │       ├── parse/route.ts   # POST: Handles email parsing
│   │       ├── calendar/route.ts# POST: Sends parsed data to Google Calendar
│   │       └── log/route.ts     # POST: Logs data to Google Sheets (or Supabase)
│   ├── components/              # Reusable UI components
│   │   ├── EmailInput.tsx       # TextArea input and button
│   │   └── JobPreview.tsx       # Preview the parsed event info before submission
│   ├── lib/                     # Utility functions and API wrappers
│   │   ├── parser.ts            # Logic to extract details from pasted text
│   │   ├── googleCalendar.ts    # Google Calendar API logic
│   │   ├── googleSheets.ts      # Google Sheets API logic
│   │   └── supabaseClient.ts    # Optional: Supabase client config
│   └── styles/                  # Tailwind or custom styles
│       └── globals.css
├── .env.local                   # API keys and secrets
├── next.config.js
├── package.json
└── README.md

🔄 Data + State Flow

    Frontend (Next.js Page + Components)

        User pastes email into EmailInput.tsx.

        On submit:

            Text is sent to /api/parse → returns structured job data.

            Displays preview via JobPreview.tsx.

            User confirms → triggers /api/calendar and /api/log.

    Backend Routes (API folder)

        POST /api/parse:

            Calls lib/parser.ts → Extracts fields (date, time, client, location).

        POST /api/calendar:

            Calls lib/googleCalendar.ts to create a new Google Calendar event.

        POST /api/log:

            Logs data to:

                Google Sheets via lib/googleSheets.ts, or

                Supabase (if .env.USE_SUPABASE=true) via lib/supabaseClient.ts.

    External Services

        Google Calendar: Used to create events programmatically.

        Google Sheets: Acts as a job log.

        Supabase (Optional): Alternative or expanded data storage for dashboard/analytics later.

🧠 State Management

    Local State: Inside React components (useState/useEffect).

        Input text

        Parsed job object

        Submission state

    Transient Server State:

        No persistent session/login is needed.

        Events are generated statelessly from a single request.

    Database State (optional):

        Supabase used to persist events, allow search/filter in future UI.

        Google Sheets stores a lightweight historical log.

🧩 Scalability Notes
Feature	Current Approach	Scale Strategy
Parsing	Rule-based regex	Optional: ML parser model
Logging	Google Sheets	Switch to Supabase full-time
Calendar	Google Calendar API	Add OAuth for multi-user support
Hosting	Vercel or Render	Keep light-weight, low-cost
Auth	None	Add Auth if sharing beyond mom
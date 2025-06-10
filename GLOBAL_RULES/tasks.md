Phase 1: Frontend Input Flow
1. Create page.tsx with a basic layout

    Start: Blank src/app/page.tsx

    End: Renders a text area and a submit button

    Test: Page loads with visible form controls

2. Build EmailInput.tsx component

    Start: New file src/components/EmailInput.tsx

    End: Accepts multiline text input and passes it via onSubmit()

    Test: Input updates state correctly, submit triggers callback

3. Wire up local state in page.tsx

    Start: Basic state hooks in page.tsx

    End: Hold emailText and parsedJob

    Test: Submitting text calls API and stores result in parsedJob

Phase 2: Parsing and Preview
4. Create /api/parse/route.ts

    Start: New API route

    End: Accepts raw text and returns hardcoded mock job object

    Test: Sending POST with text returns mock job JSON

5. Build parser.ts utility

    Start: New file in lib/parser.ts

    End: Parses basic info (date, time, job name, location) using gemini, regex as a fallback

    Test: Unit test it directly with sample email string

6. Connect API to real parsing logic

    Start: Replace mock return in /api/parse

    End: Uses parser.ts to parse request body

    Test: Parsed values returned from real input

7. Create JobPreview.tsx component

    Start: New file in components

    End: Displays parsed job fields from props

    Test: Given a job object, renders all fields

8. Render preview conditionally in page.tsx

    Start: Add parsedJob check

    End: Show JobPreview if job has been parsed

    Test: Submitting input shows preview with correct info

Phase 3: Google Calendar Integration
9. Set up Google Calendar credentials in .env.local

    Start: Add Google Service Account credentials

    End: Include GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY

    Test: Can load env vars with process.env in API route

10. Create googleCalendar.ts utility

    Start: New file in lib/googleCalendar.ts

    End: Authenticates and defines createEvent() function

    Test: Call function with dummy data → event is created on Calendar

11. Create /api/calendar/route.ts

    Start: New API route

    End: Accepts job object and calls createEvent()

    Test: POSTing to route creates event on calendar

12. Connect "confirm" button to calendar API

    Start: Add button to JobPreview.tsx

    End: On click, POST job to /api/calendar

    Test: Button creates event with correct data

Phase 4: Google Sheets Logging
13. Set up Sheets API credentials in .env.local

    Start: Add GOOGLE_SHEETS_ID, reuse Service Account creds

    End: Can access credentials in app

    Test: Load values and console log in API route

14. Create googleSheets.ts utility

    Start: New file in lib/googleSheets.ts

    End: appendRow(job) function to add job to Google Sheet

    Test: Running function logs sample row to spreadsheet

15. Create /api/log/route.ts

    Start: New API route

    End: Accepts job data and calls appendRow()

    Test: POST request appends data to sheet

16. Wire JobPreview.tsx confirm button to also log to Sheets

    Start: Modify confirm handler

    End: Submit job to both /api/calendar and /api/log

    Test: One click creates calendar event AND logs job to sheet

Phase 5: Polish & Deploy
17. Add loading + success/error states

    Start: Track submission status with React state

    End: Display loading spinner, success message, or error alert

    Test: Proper feedback shown during each step

18. Style with Tailwind CSS

    Start: Install and configure Tailwind

    End: Clean layout with responsive design

    Test: App looks neat and usable on desktop + mobile

19. Deploy to Vercel

    Start: Push code to GitHub

    End: Connect repo to Vercel for deployment

    Test: Pasting email → preview → calendar + sheet entry, all work on live site
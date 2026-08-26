/**
 * One-off health check for Quick Event: env, Gemini models, Google Calendar/Sheets auth.
 * Usage: node scripts/health-check.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { google } from 'googleapis'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function loadEnvLocal() {
  const envPath = path.join(root, '.env.local')
  const text = fs.readFileSync(envPath, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1)
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = val
  }
}

loadEnvLocal()

const sampleEmail = `Job Details
Tuesday, June 24, 2025
2:00 PM to 3:30 PM

Customer US Patent and Trademark Office
Job Title Patent Examiner Training Session
Service Captioning
Meeting Number: 987654321
Password: secret123
Dial-In Info: +1 555-0100
Phone Access Code: 111222
Meeting Link https://zoom.us/j/987654321
Rate $65
Client Jane Doe
On-Site POCs
John Smith
`

function checkEnv() {
  const keys = [
    'ACCESS_PIN',
    'GEMINI_API_KEY',
    'GOOGLE_CLIENT_EMAIL',
    'GOOGLE_PRIVATE_KEY',
    'GOOGLE_SHEETS_ID',
    'USER_CALENDAR_EMAIL',
  ]
  console.log('\n=== ENV ===')
  let ok = true
  for (const k of keys) {
    const v = process.env[k]
    const status = v && v.length > 0 ? `SET (len=${v.length})` : 'MISSING'
    if (!v) ok = false
    console.log(`${k}: ${status}`)
  }
  return ok
}

async function tryGeminiModel(modelName) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
  const model = genAI.getGenerativeModel({ model: modelName })
  const prompt = `Extract JSON only: {"date":"...","time":"...","jobName":"...","location":"...","details":"..."} from:\n${sampleEmail}`
  const result = await model.generateContent(prompt)
  const text = result.response.text()
  return text.slice(0, 400)
}

async function checkGemini() {
  console.log('\n=== GEMINI MODELS ===')
  const models = [
    'gemini-2.0-flash-exp',
    'gemini-2.5-flash',
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-flash-latest',
  ]
  const working = []
  for (const m of models) {
    try {
      const snippet = await tryGeminiModel(m)
      console.log(`OK  ${m}`)
      console.log(`    preview: ${snippet.replace(/\s+/g, ' ').slice(0, 120)}...`)
      working.push(m)
    } catch (err) {
      const msg = err?.message || String(err)
      console.log(`FAIL ${m}: ${msg.split('\n')[0].slice(0, 180)}`)
    }
  }
  return working
}

async function checkGoogleCalendar() {
  console.log('\n=== GOOGLE CALENDAR AUTH ===')
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })
  await auth.authorize()
  console.log('JWT authorize: OK')

  const calendar = google.calendar({ version: 'v3', auth })
  const userCal = process.env.USER_CALENDAR_EMAIL
  try {
    const res = await calendar.calendars.get({ calendarId: userCal })
    console.log(`User calendar access (${userCal}): OK — ${res.data.summary || userCal}`)
    return true
  } catch (err) {
    console.log(`User calendar access (${userCal}): FAIL — ${(err?.message || err).toString().slice(0, 200)}`)
    try {
      const res2 = await calendar.calendars.get({ calendarId: clientEmail })
      console.log(`Service account calendar: OK — ${res2.data.summary || clientEmail}`)
    } catch (e2) {
      console.log(`Service account calendar: FAIL — ${(e2?.message || e2).toString().slice(0, 200)}`)
    }
    return false
  }
}

async function checkGoogleSheets() {
  console.log('\n=== GOOGLE SHEETS AUTH ===')
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  await auth.authorize()
  console.log('JWT authorize: OK')

  const sheets = google.sheets({ version: 'v4', auth })
  try {
    const res = await sheets.spreadsheets.get({ spreadsheetId })
    console.log(`Spreadsheet access: OK — ${res.data.properties?.title}`)
    return true
  } catch (err) {
    console.log(`Spreadsheet access: FAIL — ${(err?.message || err).toString().slice(0, 200)}`)
    return false
  }
}

function checkDateYearBug() {
  console.log('\n=== DATE YEAR BUG (current code path) ===')
  const currentYear = new Date().getFullYear()
  const input = 'Tuesday, June 24, 2025'
  const match = input.match(/(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?/i)
  const forced = match
    ? `${currentYear}-06-${String(parseInt(match[2])).padStart(2, '0')}`
    : 'no-match'
  console.log(`Input: "${input}"`)
  console.log(`normalizeDate-style result (year forced to current): ${forced}`)
  console.log(`Expected year: 2025 | Current year: ${currentYear} | BUG active: ${!forced.startsWith('2025')}`)
}

async function main() {
  console.log('Quick Event health check')
  const envOk = checkEnv()
  if (!envOk) {
    console.log('\nAborting API checks — missing env vars.')
    process.exit(1)
  }

  checkDateYearBug()

  let geminiWorking = []
  try {
    geminiWorking = await checkGemini()
  } catch (e) {
    console.log('Gemini check crashed:', e?.message || e)
  }

  let calOk = false
  let sheetsOk = false
  try {
    calOk = await checkGoogleCalendar()
  } catch (e) {
    console.log('Calendar check crashed:', e?.message || e)
  }
  try {
    sheetsOk = await checkGoogleSheets()
  } catch (e) {
    console.log('Sheets check crashed:', e?.message || e)
  }

  console.log('\n=== SUMMARY ===')
  console.log(`Env: OK`)
  console.log(`Gemini working models: ${geminiWorking.length ? geminiWorking.join(', ') : 'NONE'}`)
  console.log(`Calendar: ${calOk ? 'OK' : 'FAIL'}`)
  console.log(`Sheets: ${sheetsOk ? 'OK' : 'FAIL'}`)
  console.log(`Parser model gemini-2.0-flash-exp — ${geminiWorking.includes('gemini-2.0-flash-exp') ? 'still works' : 'BROKEN (needs upgrade)'}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

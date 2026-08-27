import { parseEmailText } from '../src/lib/parser.ts'
import { normalizeParsedJob } from '../src/lib/dateNormalizer.ts'
import { normalizeDateFormat } from '../src/lib/timeParser.ts'

// Load .env.local
import fs from 'fs'
import path from 'path'
const envPath = path.join(process.cwd(), '.env.local')
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const t = line.trim()
  if (!t || t.startsWith('#') || !t.includes('=')) continue
  const i = t.indexOf('=')
  const k = t.slice(0, i).trim()
  let v = t.slice(i + 1)
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  if (!(k in process.env)) process.env[k] = v
}

const uspto = `Job Details
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
https://teams.microsoft.com/l/meetup-join/19%3ameeting_abc
`

const inable = `Organization: inABLE
Event: Accessibility Summit 2026
Service Type: CART
Captioner Connection Time: 09/15/2026 1:45 PM
Scheduled Start: 09/15/2026 2:00 PM
Scheduled End: 09/15/2026 4:00 PM
Meeting Number: 555666777
Password: access
Dial-In Info: +1 202-555-0199
Meeting Link https://zoom.us/j/555666777
Rate $70
`

console.log('=== Date format unit checks ===')
for (const d of ['Tuesday, June 24, 2025', 'June 24, 2025', 'June 24th', '09/15/2026']) {
  console.log(d, '->', normalizeDateFormat(d))
}

console.log('\n=== USPTO parse ===')
let t0 = Date.now()
const a = await parseEmailText(uspto)
console.log('elapsed ms:', Date.now() - t0)
console.log(JSON.stringify(a, null, 2))
const na = normalizeParsedJob(a)
console.log('normalized:', na)

console.log('\n=== inABLE parse ===')
t0 = Date.now()
const b = await parseEmailText(inable)
console.log('elapsed ms:', Date.now() - t0)
console.log(JSON.stringify(b, null, 2))
const nb = normalizeParsedJob(b)
console.log('normalized:', nb)

const checks = []
checks.push(['USPTO year 2025', na.date.startsWith('2025')])
checks.push(['USPTO jobName customer', /patent and trademark/i.test(na.jobName)])
checks.push(['USPTO start 14:00', na.startTime === '14:00'])
checks.push(['USPTO end 15:30', na.endTime === '15:30'])
checks.push(['USPTO has meeting number', /987654321/.test(na.details)])
checks.push(['USPTO has zoom link', /zoom\.us\/j\/987654321/.test(na.details)])
checks.push(['inABLE jobName', /inABLE/i.test(nb.jobName)])
checks.push(['inABLE uses captioner time 13:45', nb.startTime === '13:45'])

const currentYear = new Date().getFullYear()
const noYear = `Job Details
Wednesday, September 10
2:00 PM to 3:30 PM
Customer Test Org
Job Title Training
© 2025 Acme Corp
`
console.log('\n=== Year inference (no year in date) ===')
const c = await parseEmailText(noYear)
const nc = normalizeParsedJob(c)
console.log(c.date, '->', nc.date)
checks.push(['no-year date uses current calendar year', nc.date.startsWith(`${currentYear}-`)])
checks.push(['no-year date is September 10', nc.date.endsWith('-09-10')])
checks.push(['copyright year is ignored', !nc.date.startsWith('2025')])

console.log('\n=== CHECKS ===')
let failed = 0
for (const [name, ok] of checks) {
  console.log(ok ? 'PASS' : 'FAIL', name)
  if (!ok) failed++
}
process.exit(failed ? 1 : 0)

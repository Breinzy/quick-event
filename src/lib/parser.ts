import { GoogleGenerativeAI } from '@google/generative-ai'

interface ParsedJob {
  date?: string
  time?: string
  jobName?: string
  location?: string
  details?: string
}

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function parseEmailText(text: string): Promise<ParsedJob> {
  // Try Gemini API first
  try {
    console.log('Attempting Gemini parsing...')
    const geminiResult = await parseWithGemini(text)
    console.log('Gemini result:', geminiResult)
    if (geminiResult && (geminiResult.date || geminiResult.time || geminiResult.jobName || geminiResult.location || geminiResult.details)) {
      return geminiResult
    }
  } catch (error) {
    console.error('Gemini parsing failed, falling back to regex:', error)
  }

  // Fallback to regex parsing
  return parseWithRegex(text)
}

async function parseWithGemini(text: string): Promise<ParsedJob> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" })

  const prompt = `
Extract event information from this captioning job email. Return ONLY a JSON object with these exact fields:

{
  "date": "the date (e.g., 'June 24th' or 'April 8, 2025')",
  "time": "the time range (e.g., '2:00 PM to 3:30 PM')", 
  "jobName": "the Customer/Organization name (e.g., 'US Patent and Trademark Office', 'inABLE')",
  "location": "meeting platform with key info (e.g., 'Zoom - Meeting ID: 123456')",
  "details": "formatted details with newlines between sections"
}

CAPTIONING WORKFLOW RULES - Handle Multiple Formats:

FORMAT 1 (inABLE style):
- Organization: [name] ← USE AS jobName
- Captioner Connection Time supersedes Scheduled Start

FORMAT 2 (USPTO style):
- Customer: [name] ← USE AS jobName  
- Job Title: [description] ← PUT IN details
- Use date/time from header

ONLY INCLUDE IN DETAILS if the information actually exists:
- Event/Job Title (if found)
- Service Type/Service (if mentioned)
- Meeting Details (only fields that have real values - NO "N/A" or empty fields)
- Rate information (only if present)
- Meeting Link (only if actual link exists)
- Contact information (only if present)
- Special instructions (only if present)

CRITICAL RULES:
- DO NOT include fields with "N/A", "N/A", or empty values
- DO NOT create placeholder sections if information doesn't exist
- Only add sections that contain real, useful information
- If a meeting field is empty/missing, skip it entirely

Format details like:
"Event: [job title/event name]

Service: [service type]

Meeting Number: [number]
Password: [password]
Dial-in: [phone number]

Rate: [rate]

Contact: [contact info]

Meeting Link: [actual link]"

But only include the lines that have real data!

Email text:
${text}
`

  const result = await model.generateContent(prompt)
  const response = await result.response
  const responseText = response.text().trim()
  
  // Clean up the response to extract just the JSON
  let jsonText = responseText
  if (jsonText.includes('```json')) {
    jsonText = jsonText.split('```json')[1].split('```')[0].trim()
  } else if (jsonText.includes('```')) {
    jsonText = jsonText.split('```')[1].split('```')[0].trim()
  }
  
  try {
    return JSON.parse(jsonText)
  } catch (error) {
    console.error('Failed to parse Gemini JSON response:', error)
    throw error
  }
}

function parseWithRegex(text: string): ParsedJob {
  const parsed: ParsedJob = {}

  // FORMAT 1: inABLE style patterns
  const orgMatch = text.match(/Organization:\s*(.+)/i)
  if (orgMatch) {
    parsed.jobName = orgMatch[1].trim()
  }
  
  // Also try to get the full event name as job name
  const fullEventMatch = text.match(/Event:\s*(.+)/i)
  if (fullEventMatch && !parsed.jobName) {
    parsed.jobName = fullEventMatch[1].trim()
  }

  // FORMAT 2: USPTO/Job Details style patterns  
  const customerMatch = text.match(/Customer\s+(.+)/i)
  if (customerMatch && !parsed.jobName) {
    parsed.jobName = customerMatch[1].trim()
  }

  // Extract job title/event description
  const jobTitleMatch = text.match(/Job Title\s+(.+)/i)
  const eventMatch = text.match(/Event:\s*(.+)/i)
  
  // Service information
  const serviceMatch = text.match(/Service Type:\s*(.+)/i) || text.match(/Service\s+(.+)/i)
  
  // Meeting details
  const meetingNumberMatch = text.match(/Meeting Number:\s*(.+)/i)
  const passwordMatch = text.match(/Password:\s*(.+)/i)
  const dialInMatch = text.match(/Dial-In Info:\s*(.+)/i)
  const accessCodeMatch = text.match(/Phone Access Code:\s*(.+)/i)
  const meetingLinkMatch = text.match(/Meeting Link\s+(.+)/i)
  
  // Rate information
  const rateMatch = text.match(/Rate\s+\$?([0-9.]+)/i)
  
  // Contact information
  const clientMatch = text.match(/Client\s+(.+)/i)
  const pocMatch = text.match(/On-Site POCs?\s+([\s\S]+?)(?:\n\w+\s+|$)/i)
  
  // TIME PARSING
  
  // Format 1: Captioner Connection Time priority
  const capTimeMatch = text.match(/Captioner Connection Time:\s*(.+)/i)
  const schedStartMatch = text.match(/Scheduled Start:\s*(.+)/i)
  const schedEndMatch = text.match(/Scheduled End:\s*(.+)/i)
  
  // Format 2: Header time format "2:00 PM to 3:30 PM"
  const headerTimeMatch = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s+to\s+(\d{1,2}:\d{2}\s*(?:AM|PM))/i)
  
  let startTime = ''
  let endTime = ''
  let originalSchedule = ''
  
  if (capTimeMatch && schedEndMatch) {
    // Format 1: Use captioner connection time
    startTime = capTimeMatch[1].trim()
    endTime = schedEndMatch[1].trim()
    if (schedStartMatch && schedStartMatch[1].trim() !== startTime) {
      originalSchedule = schedStartMatch[1].trim()
    }
  } else if (headerTimeMatch) {
    // Format 2: Use header time
    startTime = headerTimeMatch[1].trim()
    endTime = headerTimeMatch[2].trim()
    parsed.time = `${startTime} to ${endTime}`
  } else if (schedStartMatch && schedEndMatch) {
    // Fallback to scheduled times
    startTime = schedStartMatch[1].trim()
    endTime = schedEndMatch[1].trim()
  }
  
  // Format time range for Format 1
  if (startTime && endTime && !parsed.time) {
    const startTimeOnly = startTime.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i)
    const endTimeOnly = endTime.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i)
    
    if (startTimeOnly && endTimeOnly) {
      parsed.time = `${startTimeOnly[1]} to ${endTimeOnly[1]}`
    } else {
      parsed.time = `${startTime} - ${endTime}`
    }
  }
  
  // DATE PARSING
  const dateFromStart = startTime.match(/(\d{1,2}\/\d{1,2}\/\d{4})/i)
  const headerDateMatch = text.match(/(\w+day,\s+\w+\s+\d{1,2},\s+\d{4})/i)
  
  if (headerDateMatch) {
    parsed.date = headerDateMatch[1]
  } else if (dateFromStart) {
    parsed.date = dateFromStart[1]
  }

  // LOCATION WITH MEETING INFO
  let locationInfo = ''
  if (meetingNumberMatch) {
    locationInfo = `Virtual Meeting - ID: ${meetingNumberMatch[1].trim()}`
  } else if (text.toLowerCase().includes('remote')) {
    locationInfo = 'Remote/Virtual'
  }
  
  const locationMatch = text.match(/Location\s+(.+)/i)
  if (locationMatch && locationMatch[1].trim().toLowerCase() !== 'remote') {
    locationInfo = locationMatch[1].trim()
  }
  
  if (locationInfo) {
    parsed.location = locationInfo
  }

  // BUILD COMPREHENSIVE DETAILS
  let details: string[] = []
  
  // Event/Job Title
  if (jobTitleMatch) {
    details.push(`Event: ${jobTitleMatch[1].trim()}`)
  } else if (eventMatch) {
    details.push(`Event: ${eventMatch[1].trim()}`)
  }
  
  // Service information
  if (serviceMatch) {
    details.push(`Service: ${serviceMatch[1].trim()}`)
  }
  
  // Meeting information - only include if we have real data
  let meetingLines: string[] = []
  if (meetingNumberMatch && meetingNumberMatch[1].trim() && !meetingNumberMatch[1].trim().toLowerCase().includes('n/a')) {
    meetingLines.push(`Meeting Number: ${meetingNumberMatch[1].trim()}`)
  }
  if (passwordMatch && passwordMatch[1].trim() && !passwordMatch[1].trim().toLowerCase().includes('n/a')) {
    meetingLines.push(`Password: ${passwordMatch[1].trim()}`)
  }
  if (dialInMatch && dialInMatch[1].trim() && !dialInMatch[1].trim().toLowerCase().includes('n/a')) {
    meetingLines.push(`Dial-in: ${dialInMatch[1].trim()}`)
  }
  if (accessCodeMatch && accessCodeMatch[1].trim() && !accessCodeMatch[1].trim().toLowerCase().includes('n/a')) {
    meetingLines.push(`Access Code: ${accessCodeMatch[1].trim()}`)
  }
  
  if (meetingLines.length > 0) {
    details.push('Meeting Info:\n' + meetingLines.join('\n'))
  }
  
  // Rate information
  if (rateMatch) {
    details.push(`Rate: $${rateMatch[1]}`)
  }
  
  // Contact information - only include if we have real data
  let contactLines: string[] = []
  if (clientMatch && clientMatch[1].trim() && !clientMatch[1].trim().toLowerCase().includes('n/a')) {
    contactLines.push(`Client: ${clientMatch[1].trim()}`)
  }
  if (pocMatch && pocMatch[1].trim() && !pocMatch[1].trim().toLowerCase().includes('n/a')) {
    const pocLines = pocMatch[1].trim().split('\n').map(line => line.trim()).filter(line => line && !line.toLowerCase().includes('n/a'))
    if (pocLines.length > 0) {
      contactLines.push('POC: ' + pocLines.join(', '))
    }
  }
  
  if (contactLines.length > 0) {
    details.push('Contact:\n' + contactLines.join('\n'))
  }
  
  // Meeting link - look for actual URLs first
  const urlPatterns = [
    /(https?:\/\/[^\s]+)/g,
    /([\w-]+\.zoom\.us\/[^\s]+)/g,
    /(teams\.microsoft\.com\/[^\s]+)/g,
    /(meet\.google\.com\/[^\s]+)/g,
    /(webex\.com\/[^\s]+)/g
  ]
  
  let foundUrls: string[] = []
  for (const pattern of urlPatterns) {
    const matches = text.match(pattern)
    if (matches) {
      foundUrls.push(...matches)
    }
  }
  
  if (foundUrls.length > 0) {
    details.push(`Meeting Link: ${foundUrls[0]}`)
  } else if (meetingLinkMatch && meetingLinkMatch[1].trim() && 
             !meetingLinkMatch[1].trim().toLowerCase().includes('n/a') &&
             meetingLinkMatch[1].trim().toLowerCase() !== 'meeting link') {
    details.push(`Meeting Link: ${meetingLinkMatch[1].trim()}`)
  }
  
  // Original schedule if different
  if (originalSchedule) {
    details.push(`Original Schedule: ${originalSchedule}`)
  }
  
  parsed.details = details.join('\n\n')

  // Fallback patterns for other email types
  if (!parsed.jobName) {
    const jobPatterns = [
      /(?:subject|re):\s*([^\n.!?]{5,50})/i,
      /(?:meeting|event|appointment)[\s:]*([^\n.!?]{5,50})/i,
    ]

    for (const pattern of jobPatterns) {
      const match = text.match(pattern)
      if (match) {
        parsed.jobName = match[1].trim().replace(/^[:\-\s]+|[:\-\s]+$/g, '')
        break
      }
    }
  }

  // Generic date fallback
  if (!parsed.date) {
    const fallbackDate = text.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\w+\s+\d{1,2},?\s+\d{4}\b/i)
    if (fallbackDate) parsed.date = fallbackDate[0]
  }

  // Generic time fallback
  if (!parsed.time) {
    const fallbackTime = text.match(/\b\d{1,2}:\d{2}\s*(?:AM|PM)\b/i)
    if (fallbackTime) parsed.time = fallbackTime[0]
  }

  return parsed
} 
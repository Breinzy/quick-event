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
Extract event information from this email text. Return ONLY a JSON object with these exact fields:

{
  "date": "the date (e.g., 'June 24th' or '06/24/2024')",
  "time": "the time (e.g., '10am-3pm' or '2:30 PM')", 
  "jobName": "the main event/activity described (e.g., 'Baseball Game Knicks vs Yankees', 'Photography Session', 'Wedding', 'Meeting with Client'). Look for ANY activity, sport, event, or job type mentioned. If truly nothing is described, use null",
  "location": "where it takes place (e.g., 'Zoom', '123 Main St', 'Central Park')",
  "details": "any additional info like codes, instructions, arrival times, technical details - do NOT include the main event description here"
}

Rules:
- Look for ANY described activity, event, game, session, meeting, etc. and use that as jobName
- jobName should be the MAIN thing happening (e.g., "Baseball Game", "Photography Shoot", "Client Meeting")
- If teams/people are involved, include them (e.g., "Baseball Game Knicks vs Yankees")
- Details should be logistics, codes, instructions - NOT the main event description
- Be precise with dates and times
- Return ONLY the JSON, no other text

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

  // Date patterns - look for various date formats
  const datePatterns = [
    /(?:on|for|date:?\s*)(\w+day,?\s+\w+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/i,
    /(?:on|for|date:?\s*)(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /(?:on|for|date:?\s*)(\d{1,2}-\d{1,2}-\d{4})/i,
    /(?:on|for|date:?\s*)(\w+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/i,
  ]

  for (const pattern of datePatterns) {
    const match = text.match(pattern)
    if (match) {
      parsed.date = match[1].trim()
      break
    }
  }

  // Time patterns - look for time formats
  const timePatterns = [
    /(?:at|time:?\s*)(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/i,
    /(?:at|time:?\s*)(\d{1,2}\s*(?:AM|PM|am|pm))/i,
    /(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/i,
  ]

  for (const pattern of timePatterns) {
    const match = text.match(pattern)
    if (match) {
      parsed.time = match[1].trim()
      break
    }
  }

  // Job/Event name patterns - look for common keywords
  const jobPatterns = [
    /(?:shoot|session|event|appointment|meeting|job|gig|photography|photo)[\s:]*([^\n.!?]{5,50})/i,
    /subject:?\s*([^\n.!?]{5,50})/i,
    /(?:for|regarding):?\s*([^\n.!?]{5,50})/i,
  ]

  for (const pattern of jobPatterns) {
    const match = text.match(pattern)
    if (match) {
      parsed.jobName = match[1].trim().replace(/^[:\-\s]+|[:\-\s]+$/g, '')
      break
    }
  }

  // Location patterns
  const locationPatterns = [
    /(?:at|location|address|venue):?\s*([^\n.!?]{5,100})/i,
    /(\d+\s+[^,\n]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|way|blvd|boulevard)[^,\n]*)/i,
  ]

  for (const pattern of locationPatterns) {
    const match = text.match(pattern)
    if (match) {
      parsed.location = match[1].trim().replace(/^[:\-\s]+|[:\-\s]+$/g, '')
      break
    }
  }

  // Fallback: try to extract any date-like and time-like strings
  if (!parsed.date) {
    const fallbackDate = text.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\w+\s+\d{1,2},?\s+\d{4}\b/i)
    if (fallbackDate) parsed.date = fallbackDate[0]
  }

  if (!parsed.time) {
    const fallbackTime = text.match(/\b\d{1,2}:\d{2}\s*(?:AM|PM)\b/i)
    if (fallbackTime) parsed.time = fallbackTime[0]
  }

  if (!parsed.jobName) {
    // Extract the first substantial line that might be a subject
    const lines = text.split('\n').filter(line => line.trim().length > 5)
    if (lines.length > 0) {
      parsed.jobName = lines[0].trim().substring(0, 50)
    }
  }

  return parsed
} 
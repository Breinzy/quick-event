import { parseTimeRange, normalizeDateFormat } from './timeParser'

interface NormalizedJob {
  date: string // YYYY-MM-DD format
  startTime: string // HH:MM format (24-hour)
  endTime: string // HH:MM format (24-hour)
  jobName: string
  location: string
  details: string
  colorId?: string
}

export function normalizeParsedJob(parsed: any): NormalizedJob {
  const currentYear = new Date().getFullYear()
  
  // Use the new time parser for better time handling
  const timeResult = parseTimeRange(parsed.time || '')
  
  // Use the new date normalizer
  const normalizedDate = normalizeDateFormat(parsed.date || '') || normalizeDate(parsed.date || '', currentYear)
  
  return {
    date: normalizedDate,
    startTime: timeResult.startTime || normalizeStartTime(parsed.time || ''),
    endTime: timeResult.endTime || normalizeEndTime(parsed.time || ''),
    jobName: parsed.jobName || '',
    location: parsed.location || '',
    details: parsed.details || '',
    colorId: parsed.colorId
  }
}

function normalizeDate(dateStr: string, currentYear: number): string {
  if (!dateStr) return ''

  // Prefer an explicit 4-digit year anywhere in the string when present
  const yearMatch = dateStr.match(/\b((?:19|20)\d{2})\b/)
  const yearFromText = yearMatch ? parseInt(yearMatch[1], 10) : currentYear

  // "Tuesday, June 24, 2025" / "June 24th, 2025" / "June 24"
  const monthDay = dateStr.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i
  )
  if (monthDay) {
    const month = getMonthNumber(monthDay[1])
    const day = parseInt(monthDay[2], 10)
    return `${yearFromText}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
  }

  // "24th of June, 2025" / "24 of June"
  const dayOfMonth = dateStr.match(
    /(\d{1,2})(?:st|nd|rd|th)?\s+of\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/i
  )
  if (dayOfMonth) {
    const day = parseInt(dayOfMonth[1], 10)
    const month = getMonthNumber(dayOfMonth[2])
    return `${yearFromText}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
  }

  // MM/DD/YYYY or M/D/YY
  const slash = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (slash) {
    const month = parseInt(slash[1], 10)
    const day = parseInt(slash[2], 10)
    let year = parseInt(slash[3], 10)
    if (year < 100) year += 2000
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
  }

  // YYYY-MM-DD
  const iso = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) {
    const year = parseInt(iso[1], 10)
    const month = parseInt(iso[2], 10)
    const day = parseInt(iso[3], 10)
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
  }

  return dateStr
}

function normalizeStartTime(timeStr: string): string {
  if (!timeStr) return ''
  const parsed = parseTimeRange(timeStr)
  if (parsed.isValid && parsed.startTime) return parsed.startTime
  
  // Handle ranges like "10-3pm", "10am-3pm", "2-2:30", "2-2:30pm"
  const rangeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?(?:am|pm)?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  if (rangeMatch) {
    const startHour = parseInt(rangeMatch[1])
    const startMinutes = rangeMatch[2] || '00'
    const endHour = parseInt(rangeMatch[3])
    const endMinutes = rangeMatch[4] || '00'
    const endPeriod = rangeMatch[5]?.toLowerCase()
    
    // If end period is specified, determine start period
    let startPeriod = endPeriod
    if (endPeriod) {
      // If start hour > end hour, assume start is opposite period
      // e.g., "10-3pm" = "10am-3pm", "9-2pm" = "9am-2pm"
      if (startHour > endHour) {
        startPeriod = endPeriod === 'pm' ? 'am' : 'pm'
      }
    }
    
    let hour24 = startHour
    if (startPeriod === 'pm' && startHour !== 12) {
      hour24 += 12
    } else if (startPeriod === 'am' && startHour === 12) {
      hour24 = 0
    }
    
    return `${hour24.toString().padStart(2, '0')}:${startMinutes}`
  }
  
  // Handle single times like "10am" or "2:30 PM"
  const singleMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i)
  if (singleMatch) {
    let hour = parseInt(singleMatch[1])
    const minutes = singleMatch[2] || '00'
    const period = singleMatch[3].toLowerCase()
    
    if (period === 'pm' && hour !== 12) {
      hour += 12
    } else if (period === 'am' && hour === 12) {
      hour = 0
    }
    
    return `${hour.toString().padStart(2, '0')}:${minutes}`
  }
  
  return timeStr
}

function normalizeEndTime(timeStr: string): string {
  if (!timeStr) return ''
  const parsed = parseTimeRange(timeStr)
  if (parsed.isValid && parsed.endTime) return parsed.endTime
  
  // Handle ranges like "10-3pm", "10am-3pm", "2-2:30", "2-2:30pm"
  const rangeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?(?:am|pm)?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  if (rangeMatch) {
    const endHour = parseInt(rangeMatch[3])
    const endMinutes = rangeMatch[4] || '00'
    const endPeriod = rangeMatch[5]?.toLowerCase()
    
    let hour24 = endHour
    if (endPeriod === 'pm' && endHour !== 12) {
      hour24 += 12
    } else if (endPeriod === 'am' && endHour === 12) {
      hour24 = 0
    }
    
    return `${hour24.toString().padStart(2, '0')}:${endMinutes}`
  }
  
  // For single times, assume 1 hour duration
  const startTime = normalizeStartTime(timeStr)
  if (startTime) {
    const [hours, minutes] = startTime.split(':').map(Number)
    const endHours = (hours + 1) % 24
    return `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }
  
  return timeStr
}

function getMonthNumber(monthName: string): number {
  const months = {
    january: 1, jan: 1,
    february: 2, feb: 2,
    march: 3, mar: 3,
    april: 4, apr: 4,
    may: 5,
    june: 6, jun: 6,
    july: 7, jul: 7,
    august: 8, aug: 8,
    september: 9, sep: 9, sept: 9,
    october: 10, oct: 10,
    november: 11, nov: 11,
    december: 12, dec: 12
  }
  
  return months[monthName.toLowerCase() as keyof typeof months] || 1
} 
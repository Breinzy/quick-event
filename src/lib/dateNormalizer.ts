interface NormalizedJob {
  date: string // YYYY-MM-DD format
  startTime: string // HH:MM format (24-hour)
  endTime: string // HH:MM format (24-hour)
  jobName: string
  location: string
  details: string
}

export function normalizeParsedJob(parsed: any): NormalizedJob {
  const currentYear = new Date().getFullYear()
  
  return {
    date: normalizeDate(parsed.date || '', currentYear),
    startTime: normalizeStartTime(parsed.time || ''),
    endTime: normalizeEndTime(parsed.time || ''),
    jobName: parsed.jobName || '',
    location: parsed.location || '',
    details: parsed.details || ''
  }
}

function normalizeDate(dateStr: string, currentYear: number): string {
  if (!dateStr) return ''
  
  // Handle various date formats
  const datePatterns = [
    // "24th of June" or "24th of june"
    /(\d{1,2})(?:st|nd|rd|th)?\s+of\s+(\w+)/i,
    // "June 24th" or "june 24"
    /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?/i,
    // "06/24/2024" or "6/24/24"
    /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/,
    // "2024-06-24"
    /(\d{4})-(\d{1,2})-(\d{1,2})/
  ]

  for (const pattern of datePatterns) {
    const match = dateStr.match(pattern)
    if (match) {
      if (pattern.source.includes('of')) {
        // "24th of June" format
        const day = parseInt(match[1])
        const monthName = match[2]
        const month = getMonthNumber(monthName)
        return `${currentYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      } else if (pattern.source.includes('\\w+')) {
        // "June 24th" format
        const monthName = match[1]
        const day = parseInt(match[2])
        const month = getMonthNumber(monthName)
        return `${currentYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      } else if (pattern.source.includes('\\/')) {
        // MM/DD/YYYY format
        const month = parseInt(match[1])
        const day = parseInt(match[2])
        let year = parseInt(match[3])
        if (year < 100) year += 2000 // Handle 2-digit years
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      } else if (pattern.source.includes('-')) {
        // YYYY-MM-DD format (already normalized)
        return dateStr
      }
    }
  }
  
  return dateStr // Return as-is if no pattern matches
}

function normalizeStartTime(timeStr: string): string {
  if (!timeStr) return ''
  
  // Handle ranges like "10-3pm" or "10am-3pm"
  const rangeMatch = timeStr.match(/(\d{1,2})(?:am|pm)?\s*[-–]\s*(\d{1,2})\s*(am|pm)/i)
  if (rangeMatch) {
    const startHour = parseInt(rangeMatch[1])
    const endHour = parseInt(rangeMatch[2])
    const endPeriod = rangeMatch[3].toLowerCase()
    
    // If start hour > end hour, assume start is opposite period
    // e.g., "10-3pm" = "10am-3pm", "9-2pm" = "9am-2pm"
    let startPeriod = endPeriod
    if (startHour > endHour) {
      startPeriod = endPeriod === 'pm' ? 'am' : 'pm'
    }
    
    let hour24 = startHour
    if (startPeriod === 'pm' && startHour !== 12) {
      hour24 += 12
    } else if (startPeriod === 'am' && startHour === 12) {
      hour24 = 0
    }
    
    return `${hour24.toString().padStart(2, '0')}:00`
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
  
  // Handle ranges like "10-3pm" or "10am-3pm"
  const rangeMatch = timeStr.match(/(\d{1,2})(?:am|pm)?\s*[-–]\s*(\d{1,2})\s*(am|pm)/i)
  if (rangeMatch) {
    const endHour = parseInt(rangeMatch[2])
    const endPeriod = rangeMatch[3].toLowerCase()
    
    let hour24 = endHour
    if (endPeriod === 'pm' && endHour !== 12) {
      hour24 += 12
    } else if (endPeriod === 'am' && endHour === 12) {
      hour24 = 0
    }
    
    return `${hour24.toString().padStart(2, '0')}:00`
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
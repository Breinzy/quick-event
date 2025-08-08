export interface ParsedTime {
  startTime?: string // HH:MM in 24-hour format
  endTime?: string   // HH:MM in 24-hour format
  isValid: boolean
}

export function parseTimeRange(timeString: string): ParsedTime {
  if (!timeString) {
    return { isValid: false }
  }

  const cleanTime = timeString.trim()

  // Try to extract time range (e.g., "10:00 AM - 11:30 AM" or "19:00 - 22:30")
  const rangeMatch = cleanTime.match(/(\d{1,2}:\d{2})\s*(AM|PM)?\s*-\s*(\d{1,2}:\d{2})\s*(AM|PM)?/i)
  
  if (rangeMatch) {
    const [, startTimeStr, startAmPm, endTimeStr, endAmPm] = rangeMatch
    
    let startTime = convertTo24Hour(startTimeStr, startAmPm)
    let endTime = convertTo24Hour(endTimeStr, endAmPm || startAmPm) // Use start AM/PM if end doesn't have it
    
    return {
      startTime,
      endTime,
      isValid: !!(startTime && endTime)
    }
  }

  // NEW: Accept flexible ranges like "2-230pm", "8am-9am", "2 PM - 3", and "2 to 3:30 pm"
  const flexible = parseFlexibleRange(cleanTime)
  if (flexible) {
    return { ...flexible, isValid: true }
  }

  // Try to extract single time (e.g., "10:00 AM" or "19:00")
  const singleMatch = cleanTime.match(/(\d{1,2}:\d{2})\s*(AM|PM)?/i)
  
  if (singleMatch) {
    const [, timeStr, amPm] = singleMatch
    const startTime = convertTo24Hour(timeStr, amPm)
    
    if (startTime) {
      // Default to 1-hour duration if only start time is provided
      const endTime = addHours(startTime, 1)
      
      return {
        startTime,
        endTime,
        isValid: true
      }
    }
  }

  // NEW: Accept compact single tokens like "230pm" or "8am"
  const singleLoose = parseLooseTimeToken(cleanTime)
  if (singleLoose?.hhmm24) {
    return { startTime: singleLoose.hhmm24, endTime: addHours(singleLoose.hhmm24, 1), isValid: true }
  }

  return { isValid: false }
}

function convertTo24Hour(timeStr: string, amPm?: string): string | undefined {
  if (!timeStr) return undefined

  const [hoursStr, minutesStr] = timeStr.split(':')
  let hours = parseInt(hoursStr, 10)
  const minutes = parseInt(minutesStr, 10)

  if (isNaN(hours) || isNaN(minutes)) {
    return undefined
  }

  // Convert based on AM/PM
  if (amPm) {
    const isAM = amPm.toLowerCase() === 'am'
    const isPM = amPm.toLowerCase() === 'pm'
    
    if (isPM && hours !== 12) {
      hours += 12
    } else if (isAM && hours === 12) {
      hours = 0
    }
  }
  // If no AM/PM provided, assume it's already in 24-hour format

  // Ensure valid time
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return undefined
  }

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

function addHours(timeStr: string, hoursToAdd: number): string {
  const [hoursStr, minutesStr] = timeStr.split(':')
  let hours = parseInt(hoursStr, 10) + hoursToAdd
  const minutes = parseInt(minutesStr, 10)

  // Handle day overflow
  if (hours >= 24) {
    hours = hours % 24
  }

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

// NEW: Normalize am/pm tokens like "p", "p.m.", "PM" to 'pm'
function normalizePeriod(input?: string | null): 'am' | 'pm' | undefined {
  if (!input) return undefined
  const s = input.toLowerCase().replace(/\./g, '').trim()
  if (s.startsWith('a')) return 'am'
  if (s.startsWith('p')) return 'pm'
  return undefined
}

// NEW: Parse a loose time token like "2", "2:30", "230", "2pm", "230pm" into its components
function parseLooseTimeToken(raw: string, inferredPeriod?: 'am' | 'pm'):
  | { hour12: number; minutes: number; period?: 'am' | 'pm'; hhmm24: string }
  | undefined {
  if (!raw) return undefined
  let token = raw.toLowerCase().trim()

  // Extract explicit period from the token, if present
  const periodMatch = token.match(/(a\.?m?\.?|p\.?m?\.?)/)
  let period = normalizePeriod(periodMatch?.[1])
  if (periodMatch) {
    token = token.replace(periodMatch[1], '')
  }
  if (!period) period = inferredPeriod

  // Keep only digits and colon
  const digits = token.replace(/[^0-9:]/g, '')
  if (!digits) return undefined

  let hour = 0
  let minutes = 0

  if (digits.includes(':')) {
    const [h, m] = digits.split(':')
    hour = parseInt(h, 10)
    minutes = parseInt(m || '0', 10)
  } else {
    if (digits.length <= 2) {
      hour = parseInt(digits, 10)
      minutes = 0
    } else if (digits.length === 3) {
      hour = parseInt(digits.slice(0, 1), 10)
      minutes = parseInt(digits.slice(1), 10)
    } else {
      // 4+ digits -> last two are minutes
      hour = parseInt(digits.slice(0, digits.length - 2), 10)
      minutes = parseInt(digits.slice(-2), 10)
    }
  }

  if (isNaN(hour) || isNaN(minutes)) return undefined
  if (minutes < 0 || minutes > 59) return undefined
  if (hour < 0 || hour > 23) {
    // For loose parsing, allow 1-12 hours before applying period
    if (hour < 1 || hour > 12) return undefined
  }

  // Convert to 24h taking into account period
  let hour24 = hour
  if (period) {
    if (period === 'pm' && hour24 !== 12) hour24 += 12
    if (period === 'am' && hour24 === 12) hour24 = 0
  }

  // If no period and hour >= 0, keep as is (could be 24h format)
  if (hour24 < 0 || hour24 > 23) return undefined

  const hhmm24 = `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  return { hour12: hour, minutes, period, hhmm24 }
}

// NEW: Parse flexible ranges like "2-230pm", "8am-9am", "2 PM - 3", "14-1530", or with 'to'
function parseFlexibleRange(input: string): { startTime: string; endTime: string } | undefined {
  const s = input
    .replace(/[\u2013\u2014]/g, '-') // en/em dashes to hyphen
    .replace(/\s+to\s+/gi, '-')
    .replace(/\s*-\s*/g, '-')
    .trim()

  const parts = s.split('-')
  if (parts.length !== 2) return undefined

  const leftRaw = parts[0].trim()
  const rightRaw = parts[1].trim()

  // Parse right first to possibly inherit its period
  const rightParsedInitial = parseLooseTimeToken(rightRaw)
  // Then parse left, inheriting period from right if needed
  let leftParsed = parseLooseTimeToken(leftRaw, rightParsedInitial?.period)
  let rightParsed = rightParsedInitial

  if (!leftParsed || !rightParsed) return undefined

  // If left had no explicit period but right did, and left hour appears to be greater than right (e.g., 10-3pm),
  // assume left is the opposite period (10am-3pm)
  if (!leftParsed.period && rightParsed.period && leftParsed.hour12 > rightParsed.hour12) {
    const opposite = rightParsed.period === 'pm' ? 'am' : 'pm'
    leftParsed = parseLooseTimeToken(leftRaw, opposite)
    if (!leftParsed) return undefined
  }

  return { startTime: leftParsed.hhmm24, endTime: rightParsed.hhmm24 }
}

export function normalizeDateFormat(dateStr: string): string | undefined {
  if (!dateStr) return undefined

  const cleanDate = dateStr.trim()

  // Try different date formats
  const formats = [
    // MM-DD-YY or MM-DD-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{2,4})$/,
    // MM/DD/YY or MM/DD/YYYY  
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/,
    // YYYY-MM-DD (already correct)
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    // DD-MM-YYYY (European)
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/
  ]

  for (const format of formats) {
    const match = cleanDate.match(format)
    if (match) {
      const [, first, second, third] = match
      
      let year: number, month: number, day: number

      if (format === formats[2]) {
        // YYYY-MM-DD format
        year = parseInt(first, 10)
        month = parseInt(second, 10)
        day = parseInt(third, 10)
      } else if (format === formats[3]) {
        // DD-MM-YYYY format
        day = parseInt(first, 10)
        month = parseInt(second, 10)
        year = parseInt(third, 10)
      } else {
        // MM-DD-YY or MM/DD/YY format
        month = parseInt(first, 10)
        day = parseInt(second, 10)
        year = parseInt(third, 10)
        
        // Handle 2-digit years
        if (year < 100) {
          year += year < 50 ? 2000 : 1900
        }
      }

      // Validate the date
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900) {
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      }
    }
  }

  return undefined
} 
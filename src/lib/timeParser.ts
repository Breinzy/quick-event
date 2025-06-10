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
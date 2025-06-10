import * as XLSX from 'xlsx'
import Papa from 'papaparse'

interface ParsedJob {
  date?: string
  time?: string
  jobName?: string
  location?: string
  details?: string
  colorId?: string
}

interface FileParseResult {
  events: ParsedJob[]
  fileName: string
  totalCount: number
}

export async function parseUploadedFile(file: File): Promise<FileParseResult> {
  const fileName = file.name
  const extension = fileName.split('.').pop()?.toLowerCase()

  let events: ParsedJob[] = []

  try {
    if (extension === 'xlsx' || extension === 'xls') {
      events = await parseExcelFile(file)
    } else if (extension === 'csv') {
      events = await parseCSVFile(file)
    } else {
      throw new Error('Unsupported file format. Please use .xlsx, .xls, or .csv files.')
    }

    return {
      events,
      fileName,
      totalCount: events.length
    }
  } catch (error) {
    console.error('File parsing error:', error)
    throw new Error(`Failed to parse ${fileName}: ${error}`)
  }
}

async function parseExcelFile(file: File): Promise<ParsedJob[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        
        // Get the first worksheet
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        
        const events = parseSpreadsheetData(jsonData as any[][])
        resolve(events)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read Excel file'))
    reader.readAsBinaryString(file)
  })
}

async function parseCSVFile(file: File): Promise<ParsedJob[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => {
        try {
          const events = parseSpreadsheetData(results.data as any[][])
          resolve(events)
        } catch (error) {
          reject(error)
        }
      },
      error: (error) => reject(error),
      skipEmptyLines: true
    })
  })
}

function parseSpreadsheetData(data: any[][]): ParsedJob[] {
  if (!data || data.length < 2) {
    throw new Error('File appears to be empty or has no data rows')
  }

  // Find header row and map columns
  const headerRow = data[0].map((h: any) => String(h || '').toLowerCase().trim())
  const columnMap = mapColumns(headerRow)
  
  const events: ParsedJob[] = []
  
  // Process each data row
  for (let i = 1; i < data.length; i++) {
    const row = data[i]
    if (!row || row.every((cell: any) => !cell || String(cell).trim() === '')) {
      continue // Skip empty rows
    }
    
    const event = parseRowToEvent(row, columnMap)
    if (event && (event.jobName || event.date || event.time)) {
      events.push(event)
    }
  }
  
  return events
}

function mapColumns(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {}
  
  // Common column mappings for captioning job spreadsheets
  const mappings = {
    // Organization/Customer/Client
    jobName: ['organization', 'customer', 'client', 'company', 'job title', 'event', 'title', 'subject'],
    
    // Date fields (be more specific to avoid confusion with time)
    date: ['date', 'event date', 'scheduled date', 'day', 'when', 'begin date', 'start date'],
    
    // Start time fields (exclude anything with 'date')
    startTime: ['start time', 'begin time', 'scheduled start', 'captioner connection time', 'start', 'begin'],
    
    // End time fields (exclude anything with 'date')
    endTime: ['end time', 'finish time', 'scheduled end', 'end', 'finish'],
    
    // Combined time range field (like "10:00 AM - 11:30 AM")
    timeRange: ['time range', 'times', 'schedule time', 'event time'],
    
    // Generic time field (fallback)
    time: ['time', 'scheduled time'],
    
    // Location
    location: ['location', 'venue', 'address', 'platform', 'meeting platform'],
    
    // Details/Notes
    details: ['details', 'description', 'notes', 'job description', 'meeting info', 'special instructions', 'comments']
  }
  
  // Map each header to the best matching field with priority order
  headers.forEach((header, index) => {
    const lowerHeader = header.toLowerCase().trim()
    
    // Skip if this header contains 'date' and we're looking at time fields
    const isDateColumn = lowerHeader.includes('date')
    
    for (const [field, patterns] of Object.entries(mappings)) {
      // Skip time fields if this is clearly a date column
      if (isDateColumn && ['startTime', 'endTime', 'timeRange', 'time'].includes(field)) {
        continue
      }
      
      // Skip date fields if this is clearly a time column (contains AM/PM/time but not date)
      if (field === 'date' && !isDateColumn && (lowerHeader.includes('time') || lowerHeader.includes('am') || lowerHeader.includes('pm'))) {
        continue
      }
      
      if (patterns.some(pattern => lowerHeader.includes(pattern))) {
        if (!map[field]) { // Take the first match for each field
          map[field] = index
        }
      }
    }
  })
  
  return map
}

function isDateValue(value: string): boolean {
  if (!value) return false
  
  const lowerValue = value.toLowerCase().trim()
  
  // Check for common date patterns
  const datePatterns = [
    /\d{1,2}\/\d{1,2}\/\d{2,4}/, // MM/DD/YYYY or M/D/YY
    /\d{1,2}-\d{1,2}-\d{2,4}/,   // MM-DD-YYYY or M-D-YY
    /\d{4}-\d{1,2}-\d{1,2}/,     // YYYY-MM-DD
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/,
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/,
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/,
    /\b(mon|tue|wed|thu|fri|sat|sun)\b/
  ]
  
  // Check if it contains date keywords
  if (lowerValue.includes('date') || 
      lowerValue.includes('day') ||
      lowerValue.includes('today') ||
      lowerValue.includes('tomorrow') ||
      lowerValue.includes('yesterday')) {
    return true
  }
  
  // Check against date patterns
  return datePatterns.some(pattern => pattern.test(lowerValue))
}

function parseRowToEvent(row: any[], columnMap: Record<string, number>): ParsedJob {
  const event: ParsedJob = {}
  
  // Extract basic fields
  if (columnMap.jobName !== undefined) {
    event.jobName = String(row[columnMap.jobName] || '').trim()
  }
  
  if (columnMap.date !== undefined) {
    event.date = String(row[columnMap.date] || '').trim()
  }
  
  if (columnMap.location !== undefined) {
    event.location = String(row[columnMap.location] || '').trim()
  }
  
  // Handle time fields - capture start and end times separately or as range
  let startTime = ''
  let endTime = ''
  let timeRange = ''
  let genericTime = ''
  
  // Get time range first (single column with both times)
  if (columnMap.timeRange !== undefined) {
    timeRange = String(row[columnMap.timeRange] || '').trim()
  }
  
  // Get start time
  if (columnMap.startTime !== undefined) {
    const value = String(row[columnMap.startTime] || '').trim()
    // Make sure it's not a date (avoid things like "Begin Date")
    if (value && !isDateValue(value)) {
      startTime = value
    }
  }
  
  // Get end time
  if (columnMap.endTime !== undefined) {
    const value = String(row[columnMap.endTime] || '').trim()
    // Make sure it's not a date
    if (value && !isDateValue(value)) {
      endTime = value
    }
  }
  
  // Get generic time as fallback
  if (columnMap.time !== undefined) {
    const value = String(row[columnMap.time] || '').trim()
    if (value && !isDateValue(value)) {
      genericTime = value
    }
  }
  
  // Look for additional time information in unmapped columns
  const additionalTimes: string[] = []
  row.forEach((cell: any, index: number) => {
    const cellStr = String(cell || '').toLowerCase().trim()
    const cellValue = String(cell || '').trim()
    
    // Check if this looks like time (has AM/PM or time format) but not date
    if ((cellStr.includes('am') || cellStr.includes('pm') || /\d{1,2}:\d{2}/.test(cellStr)) && 
        !isDateValue(cellValue) &&
        !Object.values(columnMap).includes(index)) {
      
      // Only add if it's not already captured in our main time fields
      if (cellValue && 
          cellValue !== startTime && 
          cellValue !== endTime && 
          cellValue !== timeRange &&
          cellValue !== genericTime) {
        additionalTimes.push(cellValue)
      }
    }
  })
  
  // Build the final time string
  let finalTime = ''
  
  if (timeRange) {
    // Use the time range as-is (already contains both start and end)
    finalTime = timeRange
  } else if (startTime && endTime) {
    // Both start and end time available in separate columns
    finalTime = `${startTime} - ${endTime}`
  } else if (startTime) {
    // Only start time available
    finalTime = startTime
    // Try to find end time in additional times
    if (additionalTimes.length > 0) {
      finalTime += ` - ${additionalTimes[0]}`
      additionalTimes.shift() // Remove the used time
    }
  } else if (endTime) {
    // Only end time available (unusual)
    finalTime = `End: ${endTime}`
  } else if (genericTime) {
    // Use generic time field
    finalTime = genericTime
  }
  
  // Add any remaining additional times
  if (additionalTimes.length > 0) {
    if (finalTime) {
      finalTime += ` (${additionalTimes.join(', ')})`
    } else {
      finalTime = additionalTimes.join(' - ')
    }
  }
  
  if (finalTime) {
    event.time = finalTime
  }
  
  // Collect details from various columns
  let details: string[] = []
  
  if (columnMap.details !== undefined) {
    const detailValue = String(row[columnMap.details] || '').trim()
    if (detailValue) details.push(detailValue)
  }
  
  // Add any other relevant information from unmapped columns
  row.forEach((cell: any, index: number) => {
    const cellStr = String(cell || '').trim()
    if (cellStr && cellStr.length > 5 && !Object.values(columnMap).includes(index)) {
      // Check if this looks like useful information
      if (cellStr.match(/meeting|zoom|teams|rate|contact|phone|email|\$\d+/i)) {
        details.push(cellStr)
      }
    }
  })
  
  if (details.length > 0) {
    event.details = details.join('\n\n')
  }
  
  return event
} 
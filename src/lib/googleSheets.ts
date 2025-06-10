import { google } from 'googleapis'

interface JobLogEntry {
  date: string
  startTime: string
  endTime: string
  jobName: string
  location: string
  details: string
  createdAt: string
}

// Initialize Google Sheets API
function getSheetsAuth() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  console.log('Sheets auth debug - Client email exists:', !!clientEmail)
  console.log('Sheets auth debug - Private key exists:', !!privateKey)
  console.log('Sheets auth debug - Private key length:', privateKey?.length)

  if (!clientEmail || !privateKey) {
    throw new Error('Missing Google service account credentials for Sheets API')
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  return auth
}

export async function appendRow(jobData: JobLogEntry): Promise<void> {
  try {
    console.log('Starting Google Sheets append with data:', jobData)
    
    const auth = getSheetsAuth()
    console.log('Sheets auth created, authorizing...')
    await auth.authorize()
    console.log('Sheets auth successful')
    
    const sheets = google.sheets({ version: 'v4', auth })
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID

    console.log('Spreadsheet ID:', spreadsheetId)
    if (!spreadsheetId) {
      throw new Error('Missing GOOGLE_SHEETS_ID environment variable')
    }

    // Create the row data
    const rowData = [
      new Date().toISOString(), // Timestamp
      jobData.date,
      jobData.startTime,
      jobData.endTime,
      jobData.jobName,
      jobData.location,
      jobData.details,
      jobData.createdAt
    ]

    // Append the row to the sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A:H', // Adjust range as needed
      valueInputOption: 'RAW',
      requestBody: {
        values: [rowData]
      }
    })

    console.log('Row appended to Google Sheets:', response.data.updates?.updatedRows)
  } catch (error) {
    console.error('Error appending to Google Sheets:', error)
    throw new Error(`Failed to log to Google Sheets: ${error}`)
  }
}

// Helper function to create headers if needed
export async function createHeaders(): Promise<void> {
  try {
    const auth = getSheetsAuth()
    await auth.authorize()
    
    const sheets = google.sheets({ version: 'v4', auth })
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID

    if (!spreadsheetId) {
      throw new Error('Missing GOOGLE_SHEETS_ID environment variable')
    }

    const headers = [
      'Timestamp',
      'Date',
      'Start Time',
      'End Time',
      'Event Name',
      'Location',
      'Details',
      'Created At'
    ]

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1:H1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers]
      }
    })

    console.log('Headers created in Google Sheets')
  } catch (error) {
    console.error('Error creating headers:', error)
  }
} 
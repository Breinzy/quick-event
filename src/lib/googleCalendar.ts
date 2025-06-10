import { google } from 'googleapis'

interface CalendarEvent {
  date: string // YYYY-MM-DD format
  startTime: string // HH:MM format (24-hour)
  endTime: string // HH:MM format (24-hour)
  jobName: string
  location: string
  details: string
}

// Initialize Google Calendar API
function getCalendarAuth() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  console.log('Auth debug - Client email exists:', !!clientEmail)
  console.log('Auth debug - Private key exists:', !!privateKey)
  console.log('Auth debug - Private key length:', privateKey?.length)

  if (!clientEmail || !privateKey) {
    throw new Error('Missing Google service account credentials. Check GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY environment variables.')
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })

  return auth
}

export async function createEvent(eventData: CalendarEvent): Promise<{eventId: string, eventLink: string}> {
  try {
    const auth = getCalendarAuth()
    
    // Authorize the client
    await auth.authorize()
    console.log('Auth successful')
    
    const calendar = google.calendar({ version: 'v3', auth })

    // Format start and end times as ISO strings
    const startDateTime = `${eventData.date}T${eventData.startTime}:00`
    const endDateTime = `${eventData.date}T${eventData.endTime}:00`
    
    console.log('Creating event with:', { startDateTime, endDateTime, summary: eventData.jobName })

    const event = {
      summary: eventData.jobName || 'Quick Event',
      location: eventData.location,
      description: eventData.details,
      start: {
        dateTime: startDateTime,
        timeZone: 'America/New_York', // Adjust timezone as needed
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'America/New_York',
      },
    }

    // Try multiple calendar targets
    let response;
    let calendarUsed = '';
    
    try {
      // First try: user's specific email calendar (this should work if sharing is correct)
      const userCalendarId = process.env.USER_CALENDAR_EMAIL || 'a3breinz@gmail.com'
      console.log(`Trying to create event in user calendar: ${userCalendarId}`)
      response = await calendar.events.insert({
        calendarId: userCalendarId,
        requestBody: event,
      })
      calendarUsed = `user calendar (${userCalendarId})`
    } catch (primaryError) {
      console.log('Primary calendar failed:', primaryError)
      
      try {
        // Second try: service account's own calendar
        console.log('Trying service account calendar...')
        response = await calendar.events.insert({
          calendarId: process.env.GOOGLE_CLIENT_EMAIL,
          requestBody: event,
        })
        calendarUsed = 'service account'
      } catch (serviceError) {
        console.log('Service account calendar failed:', serviceError)
        throw new Error(`Both calendar attempts failed. Primary: ${primaryError}, Service: ${serviceError}`)
      }
    }

    console.log(`Calendar event created in ${calendarUsed} calendar`)
    console.log('Event details:', {
      id: response.data.id,
      htmlLink: response.data.htmlLink,
      summary: response.data.summary,
      start: response.data.start,
      end: response.data.end
    })
    
    return {
      eventId: response.data.id || 'unknown',
      eventLink: response.data.htmlLink || 'https://calendar.google.com/calendar/u/0/r'
    }
  } catch (error) {
    console.error('Error creating calendar event:', error)
    throw new Error(`Failed to create calendar event: ${error}`)
  }
} 
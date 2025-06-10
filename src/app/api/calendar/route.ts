import { NextRequest, NextResponse } from 'next/server'
import { createEvent } from '@/lib/googleCalendar'
import { normalizeParsedJob } from '@/lib/dateNormalizer'

export async function POST(request: NextRequest) {
  try {
    const jobData = await request.json()
    
    // Validate required fields
    if (!jobData) {
      return NextResponse.json(
        { error: 'Job data is required' },
        { status: 400 }
      )
    }

    // Normalize the job data for calendar format
    const normalizedJob = normalizeParsedJob(jobData)
    
    // Validate that we have minimum required data
    if (!normalizedJob.date || !normalizedJob.startTime) {
      return NextResponse.json(
        { error: 'Date and time are required' },
        { status: 400 }
      )
    }

    // Create calendar event
    const result = await createEvent(normalizedJob)

    return NextResponse.json({ 
      success: true, 
      eventId: result.eventId,
      eventLink: result.eventLink,
      message: 'Calendar event created successfully'
    })
  } catch (error) {
    console.error('Calendar API error:', error)
    return NextResponse.json(
      { error: `Failed to create calendar event: ${error}` },
      { status: 500 }
    )
  }
} 
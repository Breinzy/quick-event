import { NextRequest, NextResponse } from 'next/server'
import { appendRow } from '@/lib/googleSheets'
import { normalizeParsedJob } from '@/lib/dateNormalizer'

export async function POST(request: NextRequest) {
  try {
    const { jobData, prompt } = await request.json()
    
    if (!jobData) {
      return NextResponse.json(
        { error: 'Job data is required' },
        { status: 400 }
      )
    }

    // Normalize the job data
    const normalizedJob = normalizeParsedJob(jobData)
    
    // Prepare data for Google Sheets
    const logEntry = {
      date: normalizedJob.date,
      startTime: normalizedJob.startTime,
      endTime: normalizedJob.endTime,
      jobName: normalizedJob.jobName,
      location: normalizedJob.location,
      details: normalizedJob.details,
      prompt: prompt || '',
      createdAt: new Date().toISOString()
    }

    // Append to Google Sheets
    await appendRow(logEntry)

    return NextResponse.json({ 
      success: true,
      message: 'Job logged to Google Sheets successfully'
    })
  } catch (error) {
    console.error('Logging API error:', error)
    return NextResponse.json(
      { error: `Failed to log to Google Sheets: ${error}` },
      { status: 500 }
    )
  }
} 
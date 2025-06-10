import { NextRequest, NextResponse } from 'next/server'
import { createHeaders } from '@/lib/googleSheets'

export async function POST(request: NextRequest) {
  try {
    await createHeaders()
    return NextResponse.json({ 
      success: true,
      message: 'Headers created successfully in Google Sheets'
    })
  } catch (error) {
    console.error('Test sheets error:', error)
    return NextResponse.json(
      { error: `Failed to access Google Sheets: ${error}` },
      { status: 500 }
    )
  }
} 
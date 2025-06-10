import { NextRequest, NextResponse } from 'next/server'
import { parseEmailText } from '@/lib/parser'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    // Use real parsing logic
    const parsedJob = await parseEmailText(text)

    return NextResponse.json(parsedJob)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to parse request' },
      { status: 500 }
    )
  }
} 
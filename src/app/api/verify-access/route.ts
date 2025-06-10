import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json()
    
    if (!pin) {
      return NextResponse.json(
        { error: 'PIN is required' },
        { status: 400 }
      )
    }

    // Check against environment variable
    const correctPin = process.env.ACCESS_PIN
    
    if (!correctPin) {
      console.error('ACCESS_PIN environment variable not set')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    if (pin === correctPin) {
      return NextResponse.json({ 
        success: true,
        message: 'Access granted' 
      })
    } else {
      // Log failed attempts (for monitoring)
      console.log(`Failed access attempt with PIN: ${pin} at ${new Date().toISOString()}`)
      
      return NextResponse.json(
        { error: 'Invalid PIN' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Access verification error:', error)
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    )
  }
} 
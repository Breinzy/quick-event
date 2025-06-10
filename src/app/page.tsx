"use client"

import React, { useState } from 'react'
import EmailInput from '@/components/EmailInput'
import JobPreview from '@/components/JobPreview'
import Notification from '@/components/Notification'
import EventHistory from '@/components/EventHistory'
import AccessControl from '@/components/AccessControl'
import { normalizeParsedJob } from '@/lib/dateNormalizer'

interface ParsedJob {
  date?: string
  time?: string
  jobName?: string
  location?: string
  details?: string
}

interface NotificationState {
  show: boolean
  type: 'success' | 'error' | 'warning'
  title: string
  message: string
  link?: string
  linkText?: string
}

interface HistoryEvent {
  id: string
  eventId: string
  eventLink: string
  name: string
  date: string
  time: string
  location?: string
  createdAt: Date
}

export default function Home() {
  const [emailText, setEmailText] = useState('')
  const [parsedJob, setParsedJob] = useState<ParsedJob | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [notification, setNotification] = useState<NotificationState>({
    show: false,
    type: 'success',
    title: '',
    message: ''
  })
  const [eventHistory, setEventHistory] = useState<HistoryEvent[]>([])
  const [hasAccess, setHasAccess] = useState(false)

  // Check if user already has access in session
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAccess = sessionStorage.getItem('quickEventAccess')
      if (savedAccess === 'granted') {
        setHasAccess(true)
      }
    }
  }, [])

  const handleEmailSubmit = async (text: string) => {
    setEmailText(text)
    setIsLoading(true)
    setLoadingMessage('Parsing email...')
    
    try {
      // Call the /api/parse endpoint
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      })
      
      if (response.ok) {
        const job = await response.json()
        setParsedJob(job)
      } else {
        console.error('Failed to parse email')
        setNotification({
          show: true,
          type: 'error',
          title: 'Parsing Failed',
          message: 'Could not parse the email. Please check the format and try again.'
        })
      }
    } catch (error) {
      console.error('Error parsing email:', error)
      setNotification({
        show: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to parse email. Please try again.'
      })
    } finally {
      setIsLoading(false)
      setLoadingMessage('')
    }
  }

  const handleConfirm = async (editedJob: ParsedJob) => {
    setIsLoading(true)
    setLoadingMessage('Creating event...')
    
    try {
      // Call both calendar and logging APIs in parallel
      const [calendarResponse, logResponse] = await Promise.all([
        fetch('/api/calendar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(editedJob),
        }),
        fetch('/api/log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(editedJob),
        })
      ])
      
      const calendarResult = calendarResponse.ok ? await calendarResponse.json() : null
      const logResult = logResponse.ok ? await logResponse.json() : null
      
      // Check results and show appropriate notifications
      if (calendarResponse.ok && logResponse.ok) {
        // Add to history - use normalized data for consistent formatting
        const normalizedJob = normalizeParsedJob(editedJob)
        const historyEvent: HistoryEvent = {
          id: Date.now().toString(),
          eventId: calendarResult.eventId,
          eventLink: calendarResult.eventLink || `https://calendar.google.com/calendar/u/0/r`,
          name: editedJob.jobName || 'Untitled Event',
          date: normalizedJob.date, // Use normalized YYYY-MM-DD format
          time: editedJob.time || '', // Keep original time for display
          location: editedJob.location,
          createdAt: new Date()
        }
        setEventHistory(prev => [historyEvent, ...prev])

        setNotification({
          show: true,
          type: 'success',
          title: 'Event Created Successfully!',
          message: 'Calendar event created and logged to Google Sheets.',
          link: calendarResult.eventLink || `https://calendar.google.com/calendar/u/0/r`,
          linkText: 'View in Calendar'
        })
        
        // Clear the form after successful creation
        setParsedJob(null)
        setEmailText('')
      } else if (calendarResponse.ok) {
        // Add to history even for partial success - use normalized data
        const normalizedJob = normalizeParsedJob(editedJob)
        const historyEvent: HistoryEvent = {
          id: Date.now().toString(),
          eventId: calendarResult.eventId,
          eventLink: calendarResult.eventLink || `https://calendar.google.com/calendar/u/0/r`,
          name: editedJob.jobName || 'Untitled Event',
          date: normalizedJob.date, // Use normalized YYYY-MM-DD format
          time: editedJob.time || '', // Keep original time for display
          location: editedJob.location,
          createdAt: new Date()
        }
        setEventHistory(prev => [historyEvent, ...prev])

        setNotification({
          show: true,
          type: 'warning',
          title: 'Partial Success',
          message: 'Calendar event created, but failed to log to Google Sheets.',
          link: calendarResult.eventLink || `https://calendar.google.com/calendar/u/0/r`,
          linkText: 'View in Calendar'
        })
      } else if (logResponse.ok) {
        setNotification({
          show: true,
          type: 'warning',
          title: 'Partial Success',
          message: 'Event logged to Google Sheets, but failed to create calendar event.'
        })
      } else {
        const calendarError = calendarResponse.ok ? null : await calendarResponse.json()
        const logError = logResponse.ok ? null : await logResponse.json()
        setNotification({
          show: true,
          type: 'error',
          title: 'Creation Failed',
          message: `Failed to create event: ${calendarError?.error || logError?.error || 'Unknown error'}`
        })
      }
    } catch (error) {
      console.error('Error calling APIs:', error)
      setNotification({
        show: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to create event. Please try again.'
      })
    } finally {
      setIsLoading(false)
      setLoadingMessage('')
    }
  }

  const handleClearHistory = () => {
    setEventHistory([])
  }

  // Show access control if user doesn't have access
  if (!hasAccess) {
    return <AccessControl onAccessGranted={() => setHasAccess(true)} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-light mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Quick Event
            </h1>
            <p className="text-gray-400 text-sm">
              Turn emails into calendar events instantly
            </p>
          </div>
          
          {!parsedJob ? (
            <EmailInput 
              onSubmit={handleEmailSubmit} 
              isLoading={isLoading}
              loadingMessage={loadingMessage}
            />
          ) : (
            <JobPreview 
              job={parsedJob}
              onConfirm={handleConfirm}
              onBack={() => setParsedJob(null)}
              isLoading={isLoading}
              loadingMessage={loadingMessage}
            />
          )}

          <EventHistory 
            events={eventHistory}
            onClearHistory={handleClearHistory}
          />
        </div>
      </div>

      {notification.show && (
        <Notification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          link={notification.link}
          linkText={notification.linkText}
          onClose={() => setNotification({ ...notification, show: false })}
          duration={8000}
        />
      )}
    </div>
  )
} 
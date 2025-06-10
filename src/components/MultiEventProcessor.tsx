"use client"

import React, { useState } from 'react'
import JobPreview from './JobPreview'

// Google Calendar color mapping
const CALENDAR_COLORS = {
  '1': '#a4bdfc', // Lavender
  '2': '#7ae7bf', // Sage
  '3': '#dbadff', // Grape
  '4': '#ff887c', // Flamingo
  '5': '#fbd75b', // Banana
  '6': '#ffb878', // Tangerine
  '7': '#46d6db', // Peacock
  '8': '#e1e1e1', // Graphite
  '9': '#5484ed', // Blueberry
  '10': '#51b749', // Basil
  '11': '#dc2127', // Tomato
} as const

function getColorById(colorId: string): string {
  return CALENDAR_COLORS[colorId as keyof typeof CALENDAR_COLORS] || '#a4bdfc'
}

interface ParsedJob {
  date?: string
  time?: string
  jobName?: string
  location?: string
  details?: string
  colorId?: string
}

interface MultiEventProcessorProps {
  events: ParsedJob[]
  fileName: string
  onEventConfirmed: (event: ParsedJob) => Promise<void>
  onAllComplete: () => void
  onCancel: () => void
  isLoading?: boolean
  loadingMessage?: string
}

export default function MultiEventProcessor({
  events,
  fileName,
  onEventConfirmed,
  onAllComplete,
  onCancel,
  isLoading = false,
  loadingMessage = ''
}: MultiEventProcessorProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [completedEvents, setCompletedEvents] = useState<Set<number>>(new Set())
  const [globalEventName, setGlobalEventName] = useState<string>('')
  const [globalColorId, setGlobalColorId] = useState<string>('')

  // Apply global event name and color to current event
  const currentEvent = {
    ...events[currentIndex],
    jobName: globalEventName || events[currentIndex]?.jobName || '',
    colorId: globalColorId || events[currentIndex]?.colorId || ''
  }
  const totalEvents = events.length
  const completedCount = completedEvents.size

  const handleConfirm = async (editedEvent: ParsedJob) => {
    try {
      // Update global event name if it was changed
      if (editedEvent.jobName && editedEvent.jobName !== globalEventName) {
        setGlobalEventName(editedEvent.jobName)
      }
      
      // Update global color if it was changed
      if (editedEvent.colorId && editedEvent.colorId !== globalColorId) {
        setGlobalColorId(editedEvent.colorId)
      }
      
      await onEventConfirmed(editedEvent)
      
      // Mark current event as completed
      const newCompleted = new Set(completedEvents)
      newCompleted.add(currentIndex)
      setCompletedEvents(newCompleted)
      
      // Move to next event or complete
      if (currentIndex + 1 < totalEvents) {
        setCurrentIndex(currentIndex + 1)
      } else {
        onAllComplete()
      }
    } catch (error) {
      console.error('Error confirming event:', error)
      // The error handling is done in the parent component
    }
  }

  const handleSkip = () => {
    if (currentIndex + 1 < totalEvents) {
      setCurrentIndex(currentIndex + 1)
    } else {
      onAllComplete()
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleGoToEvent = (index: number) => {
    setCurrentIndex(index)
  }

  return (
    <div className="space-y-6">
      {/* Header with file info and progress */}
      <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Processing Events</h2>
            <p className="text-gray-400 text-sm">From: {fileName}</p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors px-3 py-1 text-sm"
            disabled={isLoading}
          >
            Cancel
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
            <span>Progress: {completedCount} of {totalEvents} events</span>
            <span>{Math.round((completedCount / totalEvents) * 100)}% complete</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-green-600 to-emerald-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / totalEvents) * 100}%` }}
            />
          </div>
        </div>

        {/* Event navigation */}
        <div className="flex flex-wrap gap-2">
          {events.map((_, index) => (
            <button
              key={index}
              onClick={() => handleGoToEvent(index)}
              className={`w-8 h-8 rounded text-xs font-medium transition-all ${
                index === currentIndex
                  ? 'bg-blue-600 text-white'
                  : completedEvents.has(index)
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              disabled={isLoading}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Current event */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-white">
              Event {currentIndex + 1} of {totalEvents}
              {completedEvents.has(currentIndex) && (
                <span className="ml-2 text-green-400">✓ Completed</span>
              )}
            </h3>
            {(globalEventName || globalColorId) && (
              <div className="text-sm text-blue-400 mt-1 space-y-1">
                {globalEventName && (
                  <p>📌 Using shared name: "{globalEventName}"</p>
                )}
                {globalColorId && (
                  <p className="flex items-center gap-2">
                    🎨 Using shared color: 
                    <span 
                      className="w-4 h-4 rounded-full border border-gray-300 inline-block"
                      style={{ 
                        backgroundColor: getColorById(globalColorId)
                      }}
                    ></span>
                  </p>
                )}
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0 || isLoading}
              className="px-3 py-1 text-sm bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>
            <button
              onClick={handleSkip}
              disabled={isLoading}
              className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 transition-colors"
            >
              Skip →
            </button>
          </div>
        </div>

        <JobPreview
          job={currentEvent}
          onConfirm={handleConfirm}
          onBack={onCancel}
          isLoading={isLoading}
          loadingMessage={loadingMessage}
        />
      </div>

      {/* Summary */}
      {completedCount > 0 && (
        <div className="bg-green-600/20 border border-green-600/30 rounded-lg p-4">
          <p className="text-green-400 text-sm">
            ✅ {completedCount} event{completedCount !== 1 ? 's' : ''} successfully created
          </p>
        </div>
      )}
    </div>
  )
} 
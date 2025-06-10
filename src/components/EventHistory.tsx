"use client"

import React, { useState } from 'react'

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

interface EventHistoryProps {
  events: HistoryEvent[]
  onClearHistory: () => void
}

export default function EventHistory({ events, onClearHistory }: EventHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  if (events.length === 0) {
    return null
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'No date'
    
    try {
      // Try to parse the date string
      let date = new Date(dateStr)
      
      // If the date is invalid, try some common formats
      if (isNaN(date.getTime())) {
        // Try removing ordinal suffixes (1st, 2nd, 3rd, 4th, etc.)
        const cleanedStr = dateStr.replace(/(\d+)(st|nd|rd|th)/g, '$1')
        date = new Date(cleanedStr)
      }
      
      // If still invalid, just return the original string
      if (isNaN(date.getTime())) {
        return dateStr
      }
      
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="mt-8 bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700/50">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-700/20 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <span className="text-lg">📅</span>
          <h3 className="text-lg font-medium text-white">
            Session History ({events.length})
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          {events.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClearHistory()
              }}
              className="text-xs text-gray-400 hover:text-red-400 transition-colors px-2 py-1"
            >
              Clear
            </button>
          )}
          <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="space-y-3">
            {events.map((event) => (
              <div 
                key={event.id}
                className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg border border-gray-600/30 hover:border-gray-500/50 transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-white truncate">
                      {event.name}
                    </h4>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatTime(event.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <span>📆 {formatDate(event.date)}</span>
                    <span>🕒 {event.time}</span>
                    {event.location && (
                      <span className="truncate">📍 {event.location}</span>
                    )}
                  </div>
                </div>
                
                <a
                  href={event.eventLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-4 px-3 py-1.5 text-xs bg-blue-600/80 hover:bg-blue-600 text-white rounded-md transition-colors whitespace-nowrap opacity-70 group-hover:opacity-100"
                >
                  View Event →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 
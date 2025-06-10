"use client"

import React, { useEffect } from 'react'

interface NotificationProps {
  type: 'success' | 'error' | 'warning'
  title: string
  message: string
  link?: string
  linkText?: string
  onClose: () => void
  duration?: number
}

export default function Notification({ 
  type, 
  title, 
  message, 
  link, 
  linkText, 
  onClose, 
  duration = 5000 
}: NotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [onClose, duration])

  const bgColor = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-yellow-600'
  }[type]

  const icon = {
    success: '✅',
    error: '❌', 
    warning: '⚠️'
  }[type]

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-slide-in">
      <div className={`${bgColor} text-white rounded-lg shadow-lg p-4 border-l-4 border-white/30`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <span className="text-xl">{icon}</span>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">{title}</h4>
              <p className="text-sm opacity-90 mt-1">{message}</p>
              {link && linkText && (
                <a 
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors"
                >
                  {linkText} →
                </a>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/70 hover:text-white text-lg leading-none ml-2"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
} 
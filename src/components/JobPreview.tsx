"use client"

import React, { useState, useEffect } from 'react'

interface ParsedJob {
  date?: string
  time?: string
  jobName?: string
  location?: string
  details?: string
}

interface JobPreviewProps {
  job: ParsedJob
  onConfirm: (editedJob: ParsedJob) => void
  onBack: () => void
  isLoading?: boolean
  loadingMessage?: string
}

export default function JobPreview({ job, onConfirm, onBack, isLoading = false, loadingMessage = '' }: JobPreviewProps) {
  const [editedJob, setEditedJob] = useState<ParsedJob>(job)

  useEffect(() => {
    setEditedJob(job)
  }, [job])

  const handleInputChange = (field: keyof ParsedJob, value: string) => {
    setEditedJob(prev => ({ ...prev, [field]: value }))
  }

  const handleConfirm = () => {
    onConfirm(editedJob)
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Review & Edit Event Information</h2>
        <button 
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors"
          disabled={isLoading}
        >
          ← Back
        </button>
      </div>
      
      <div className="space-y-4 mb-8">
        <div>
          <label className="block text-gray-400 text-sm mb-2">Event Name:</label>
          <input
            type="text"
            value={editedJob.jobName || ''}
            onChange={(e) => handleInputChange('jobName', e.target.value)}
            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 text-white rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            placeholder="Enter event name (e.g., Photography Session)"
            disabled={isLoading}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Date:</label>
            <input
              type="text"
              value={editedJob.date || ''}
              onChange={(e) => handleInputChange('date', e.target.value)}
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 text-white rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              placeholder="Enter date (e.g., June 24, 2025)"
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="block text-gray-400 text-sm mb-2">Time:</label>
            <input
              type="text"
              value={editedJob.time || ''}
              onChange={(e) => handleInputChange('time', e.target.value)}
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 text-white rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              placeholder="Enter time (e.g., 10am-3pm or 2:30 PM)"
              disabled={isLoading}
            />
          </div>
        </div>
        
        <div>
          <label className="block text-gray-400 text-sm mb-2">Location:</label>
          <input
            type="text"
            value={editedJob.location || ''}
            onChange={(e) => handleInputChange('location', e.target.value)}
            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 text-white rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            placeholder="Enter location (e.g., Zoom, 123 Main St)"
            disabled={isLoading}
          />
        </div>
        
        <div>
          <label className="block text-gray-400 text-sm mb-2">Details:</label>
          <textarea
            value={editedJob.details || ''}
            onChange={(e) => handleInputChange('details', e.target.value)}
            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 text-white rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-vertical transition-all"
            rows={3}
            placeholder="Additional details (codes, instructions, notes, etc.)"
            disabled={isLoading}
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          {isLoading && loadingMessage && (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              <span>{loadingMessage}</span>
            </div>
          )}
        </div>
        
        <button
          onClick={handleConfirm}
          className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 font-semibold"
          disabled={isLoading}
        >
          {isLoading ? 'Creating...' : 'Create Calendar Event'}
        </button>
      </div>
    </div>
  )
} 
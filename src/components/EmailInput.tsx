"use client"

import React, { useState } from 'react'

interface EmailInputProps {
  onSubmit: (emailText: string) => void
  isLoading?: boolean
  loadingMessage?: string
}

export default function EmailInput({ onSubmit, isLoading = false, loadingMessage = '' }: EmailInputProps) {
  const [emailText, setEmailText] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (emailText.trim()) {
      onSubmit(emailText)
    }
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
      <form onSubmit={handleSubmit}>
        <textarea
          value={emailText}
          onChange={(e) => setEmailText(e.target.value)}
          className="w-full h-64 p-4 bg-gray-900/50 border border-gray-600 text-white rounded-lg resize-vertical placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          placeholder="Paste your email content here...

💡 Tip: If there are meeting links, try copying them separately and including the full URL in your paste"
          required
          disabled={isLoading}
        />
        
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-400">
            {isLoading && loadingMessage && (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span>{loadingMessage}</span>
              </div>
            )}
          </div>
          
          <button
            type="submit"
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
            disabled={!emailText.trim() || isLoading}
          >
            {isLoading ? 'Processing...' : 'Parse Email'}
          </button>
        </div>
      </form>
    </div>
  )
} 
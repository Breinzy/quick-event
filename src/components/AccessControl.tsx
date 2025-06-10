"use client"

import React, { useState } from 'react'

interface AccessControlProps {
  onAccessGranted: () => void
}

export default function AccessControl({ onAccessGranted }: AccessControlProps) {
  const [pin, setPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pin.trim()) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/verify-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      if (response.ok) {
        // Store access in sessionStorage so they don't need to re-enter
        sessionStorage.setItem('quickEventAccess', 'granted')
        onAccessGranted()
      } else {
        setError('Invalid PIN. Please try again.')
        setPin('')
      }
    } catch (error) {
      setError('Connection error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
      <div className="max-w-md mx-auto p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-light mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Quick Event
          </h1>
          <p className="text-gray-400 text-sm mb-6">
            Enter your PIN to access the calendar app
          </p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">PIN</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 text-white rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-center text-lg tracking-wider"
                placeholder="Enter PIN"
                maxLength={10}
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-600/20 border border-red-600/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
              disabled={!pin.trim() || isLoading}
            >
              {isLoading ? 'Verifying...' : 'Access App'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Don't have the PIN? Contact the app owner.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 
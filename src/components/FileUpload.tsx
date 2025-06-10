"use client"

import React, { useState, useRef } from 'react'
import { parseUploadedFile } from '../lib/fileParser'

interface ParsedJob {
  date?: string
  time?: string
  jobName?: string
  location?: string
  details?: string
  colorId?: string
}

interface FileUploadProps {
  onFileProcessed: (events: ParsedJob[], fileName: string) => void
  isLoading?: boolean
}

export default function FileUpload({ onFileProcessed, isLoading = false }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    if (!file) return
    
    // Check file type
    const allowedTypes = ['.xlsx', '.xls', '.csv']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    
    if (!allowedTypes.includes(fileExtension)) {
      setError('Please upload an Excel (.xlsx, .xls) or CSV file')
      return
    }
    
    setError('')
    setIsProcessing(true)
    
    try {
      const result = await parseUploadedFile(file)
      
      if (result.events.length === 0) {
        setError('No events found in the file. Please check the file format.')
        return
      }
      
      onFileProcessed(result.events, result.fileName)
    } catch (error) {
      console.error('File processing error:', error)
      setError(error instanceof Error ? error.message : 'Failed to process file')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
      <div className="text-center mb-4">
        <h3 className="text-lg font-medium text-white mb-2">Upload Events File</h3>
        <p className="text-gray-400 text-sm">
          Upload an Excel (.xlsx) or CSV file with multiple events
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
          isDragOver
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-600 hover:border-gray-500 hover:bg-gray-700/20'
        } ${isProcessing || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isProcessing || isLoading}
        />

        <div className="space-y-3">
          <div className="text-4xl">
            {isProcessing ? '⏳' : '📁'}
          </div>
          
          <div>
            <p className="text-white font-medium">
              {isProcessing ? 'Processing file...' : 'Drop your file here or click to browse'}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Supports .xlsx, .xls, and .csv files
            </p>
          </div>
          
          {!isProcessing && !isLoading && (
            <button
              type="button"
              className="mt-4 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105"
            >
              Choose File
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-600/20 border border-red-600/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        <p className="mb-2">💡 <strong>File format tips:</strong></p>
        <ul className="space-y-1 pl-4">
          <li>• First row should contain column headers</li>
          <li>• Include columns for: Organization, Date, Time, Location, Details</li>
          <li>• Each row represents one event</li>
        </ul>
      </div>
    </div>
  )
} 
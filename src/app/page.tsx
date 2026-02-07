'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [showDemo, setShowDemo] = useState(true)
  const router = useRouter()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      return null
    }
    return createClient(supabaseUrl, supabaseAnonKey)
  }, [supabaseUrl, supabaseAnonKey])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      
      // Validate file type
      if (selectedFile.type !== 'application/pdf') {
        setError('Please select a PDF file')
        setFile(null)
        return
      }
      
      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024 // 10MB in bytes
      if (selectedFile.size > maxSize) {
        setError(`File size must be less than 10MB. Your file is ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`)
        setFile(null)
        return
      }
      
      setFile(selectedFile)
      setError('')
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first')
      return
    }

    if (!supabase) {
      setError('Missing Supabase env vars. Check Vercel/Local environment configuration.')
      return
    }

    setUploading(true)
    setStatus('Uploading PDF...')
    setError('')

    try {
      // Upload to Supabase Storage
      const fileName = `${Date.now()}-${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(fileName, file)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      setStatus('Processing PDF with Docling AI...')

      // Call the parse-pdf edge function
      const { data: functionData, error: functionError } = await supabase.functions.invoke('parse-pdf', {
        body: { path: uploadData.path, bucket: 'pdfs' }
      })

      if (functionError) {
        console.error('Edge function error:', functionError)
        throw new Error(`Processing failed: ${functionError.message}`)
      }
      
      setStatus('Generating embeddings...')

      setStatus('PDF processed successfully!')
      
      // Redirect to search page
      if (functionData.document_id) {
        setTimeout(() => {
          router.push(`/search/${functionData.document_id}`)
        }, 1500)
      } else {
        // Fallback: redirect to home if no document_id returned
        setError('Processing completed but no document ID was returned')
      }
    } catch (err: any) {
      console.error('Upload/processing error:', err)
      const message = err.message || 'An error occurred during upload/processing'
      setError(message)
      setStatus('')
    } finally {
      setUploading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-5xl font-bold text-center mb-4 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
            PDF Insight Extractor
          </h1>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-8">
            Upload your PDF and unlock AI-powered semantic search
          </p>

          {/* Demo Instructions Banner */}
          {showDemo && (
            <div className="mb-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-6 text-white relative">
              <button
                onClick={() => setShowDemo(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white"
                aria-label="Dismiss"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-xl font-bold mb-3">🎯 Quick Demo Guide</h3>
              <ol className="space-y-2 text-sm text-white/90">
                <li><strong>1. Upload:</strong> Select any PDF (resume, report, article)</li>
                <li><strong>2. Wait:</strong> Docling AI parses ~20-30 seconds</li>
                <li><strong>3. Search:</strong> Ask natural questions like &quot;What are the key findings?&quot;</li>
                <li><strong>4. Explore:</strong> View results with similarity scores and metadata</li>
              </ol>
              <p className="mt-3 text-xs text-white/70">
                💡 Try searching &quot;experience&quot; in a resume or &quot;revenue&quot; in a financial report
              </p>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select PDF File
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="block w-full text-sm text-gray-500 dark:text-gray-400
                    file:mr-4 file:py-3 file:px-6
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-gradient-to-r file:from-blue-500 file:to-purple-500
                    file:text-white
                    hover:file:from-blue-600 hover:file:to-purple-600
                    file:cursor-pointer
                    disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {file && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full py-4 px-6 rounded-lg font-semibold text-white
                  bg-gradient-to-r from-blue-500 to-purple-500
                  hover:from-blue-600 hover:to-purple-600
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200 transform hover:scale-105
                  shadow-lg"
              >
                {uploading ? 'Processing...' : 'Upload & Parse PDF'}
              </button>

              {status && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <p className="text-blue-800 dark:text-blue-300 text-sm">{status}</p>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                  <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 bg-white/50 dark:bg-gray-800/50 rounded-xl p-6 backdrop-blur-sm">
            <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
              How it works:
            </h2>
            <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>1. Upload your PDF document (up to 10MB)</li>
              <li>2. Docling AI extracts text, tables, and layout</li>
              <li>3. Content is chunked and embedded with OpenAI</li>
              <li>4. Search semantically through your document</li>
            </ol>
          </div>
        </div>
      </div>
    </main>
  )
}

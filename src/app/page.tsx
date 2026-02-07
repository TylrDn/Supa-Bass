'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile)
        setError('')
      } else {
        setError('Please select a PDF file')
        setFile(null)
      }
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first')
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

      if (uploadError) throw uploadError

      setStatus('Processing PDF with Docling...')

      // Call the parse-pdf edge function
      const { data: functionData, error: functionError } = await supabase.functions.invoke('parse-pdf', {
        body: { storagePath: uploadData.path }
      })

      if (functionError) throw functionError

      setStatus('PDF processed successfully!')
      
      // Redirect to search page
      if (functionData.documentId) {
        setTimeout(() => {
          router.push(`/search/${functionData.documentId}`)
        }, 1500)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload')
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
          <p className="text-center text-gray-600 dark:text-gray-300 mb-12">
            Upload your PDF and unlock AI-powered semantic search
          </p>

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

'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface SearchResult {
  id: string
  content: string
  metadata: any
  similarity: number
}

export default function SearchPage({ params }: { params: { docId: string } }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [documentName, setDocumentName] = useState('')
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const router = useRouter()

  useEffect(() => {
    // Fetch document info
    const fetchDocument = async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('filename')
        .eq('id', params.docId)
        .single()

      if (data) {
        setDocumentName(data.filename)
      }
    }
    fetchDocument()
  }, [params.docId, supabase])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!query.trim()) {
      setError('Please enter a search query')
      return
    }

    setSearching(true)
    setError('')
    setResults([])

    try {
      const { data, error: searchError } = await supabase.rpc('search_chunks', {
        query_text: query,
        doc_id: params.docId,
        match_count: 5
      })

      if (searchError) throw searchError

      setResults(data || [])
      
      if (!data || data.length === 0) {
        setError('No results found. Try a different query.')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during search')
    } finally {
      setSearching(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <Link 
            href="/"
            className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline mb-6"
          >
            ← Back to Upload
          </Link>

          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
            Search Document
          </h1>
          {documentName && (
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              Searching in: {documentName}
            </p>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8">
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search Query
                </label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask a question about your document..."
                  disabled={searching}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                    focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <button
                type="submit"
                disabled={searching || !query.trim()}
                className="w-full py-3 px-6 rounded-lg font-semibold text-white
                  bg-gradient-to-r from-blue-500 to-purple-500
                  hover:from-blue-600 hover:to-purple-600
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                  shadow-lg"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </form>

            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
              </div>
            )}
          </div>

          {results.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                Search Results
              </h2>
              {results.map((result, index) => (
                <div
                  key={result.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      Match {index + 1}
                    </span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      {(result.similarity * 100).toFixed(1)}% similarity
                    </span>
                  </div>

                  <p className="text-gray-800 dark:text-gray-200 mb-4 leading-relaxed">
                    {result.content}
                  </p>

                  {result.metadata && (
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                      {result.metadata.type && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                          Type: {result.metadata.type}
                        </span>
                      )}
                      {result.metadata.page !== undefined && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                          Page: {result.metadata.page}
                        </span>
                      )}
                      {result.metadata.bbox && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                          Position: ({result.metadata.bbox.l?.toFixed(0)}, {result.metadata.bbox.t?.toFixed(0)})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

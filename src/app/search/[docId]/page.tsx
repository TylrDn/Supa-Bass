'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

interface SearchResult {
  chunk_id: string
  content: string
  metadata: Record<string, unknown>
  similarity: number
}

export default function SearchPage({ params }: { params: { docId: string } }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [documentName, setDocumentName] = useState('')
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
      ),
    [],
  )

  useEffect(() => {
    const fetchDocument = async () => {
      const { data } = await supabase
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
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query_text: query,
          doc_id: params.docId,
          match_count: 5,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Search request failed')
      }

      const data: SearchResult[] = await res.json()
      setResults(data)

      if (data.length === 0) {
        setError('No results found. Try a different query.')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred during search'
      setError(message)
    } finally {
      setSearching(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#3ecf8e] via-[#3b82f6] to-[#6c3fc5]">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center text-white/80 hover:text-white hover:underline mb-6"
          >
            ← Back to Upload
          </Link>

          <h1 className="text-4xl font-bold mb-2 text-white drop-shadow-lg">
            Search Document
          </h1>
          {documentName && (
            <p className="text-white/70 mb-8">Searching in: {documentName}</p>
          )}

          {/* Glassmorphism search card */}
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8 mb-8">
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Search Query
                </label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask a question about your document…"
                  disabled={searching}
                  className="w-full px-4 py-3 rounded-lg border border-white/30
                    bg-white/10 text-white placeholder-white/50
                    focus:ring-2 focus:ring-white/50 focus:border-transparent
                    disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur"
                />
              </div>

              <button
                type="submit"
                disabled={searching || !query.trim()}
                className="w-full py-3 px-6 rounded-lg font-semibold text-white
                  bg-white/20 hover:bg-white/30
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200 border border-white/30
                  shadow-lg backdrop-blur"
              >
                {searching ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Searching…
                  </span>
                ) : (
                  'Search'
                )}
              </button>
            </form>

            {error && (
              <div className="mt-4 p-4 bg-red-500/20 border border-red-300/30 rounded-lg backdrop-blur">
                <p className="text-white text-sm">{error}</p>
              </div>
            )}
          </div>

          {results.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">
                Search Results
              </h2>
              {results.map((result, index) => (
                <div
                  key={result.chunk_id ?? index}
                  className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl shadow-lg p-6
                    hover:bg-white/20 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/20 text-white">
                      Match {index + 1}
                    </span>
                    <span className="text-sm font-medium text-emerald-300">
                      {(result.similarity * 100).toFixed(1)}% similarity
                    </span>
                  </div>

                  <p className="text-white/90 mb-4 leading-relaxed line-clamp-6">
                    {result.content}
                  </p>

                  {result.metadata && (
                    <div className="flex flex-wrap gap-2 text-xs text-white/60">
                      {(result.metadata as Record<string, unknown>).type ? (
                        <span className="px-2 py-1 bg-white/10 rounded">
                          Type: {String((result.metadata as Record<string, unknown>).type)}
                        </span>
                      ) : null}
                      {(result.metadata as Record<string, unknown>).page !== undefined ? (
                        <span className="px-2 py-1 bg-white/10 rounded">
                          Page: {String((result.metadata as Record<string, unknown>).page)}
                        </span>
                      ) : null}
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

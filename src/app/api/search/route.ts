import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { query_text, doc_id, match_count = 5 } = await req.json()

    if (!query_text || !doc_id) {
      return NextResponse.json(
        { error: 'query_text and doc_id are required' },
        { status: 400 },
      )
    }

    const openaiKey = process.env.OPENAI_API_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!openaiKey || !supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server is missing required configuration' },
        { status: 500 },
      )
    }

    // 1. Generate embedding via OpenAI
    const embeddingRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: query_text,
      }),
    })

    if (!embeddingRes.ok) {
      const detail = await embeddingRes.text()
      return NextResponse.json(
        { error: `Embedding generation failed: ${detail}` },
        { status: 502 },
      )
    }

    const embeddingData = await embeddingRes.json()
    const queryEmbedding = embeddingData.data[0].embedding as number[]

    // 2. Call Supabase RPC with the embedding
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error: rpcError } = await supabase.rpc('search_chunks', {
      query_embedding: queryEmbedding,
      doc_id,
      match_count,
    })

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

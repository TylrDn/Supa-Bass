import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_CHUNKS = 50
const EMBED_BATCH_SIZE = 20

export interface DoclingChunk {
  content: string
  metadata: {
    type: string
    page?: number
    bbox?: unknown
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const bucket: string = body.bucket ?? 'pdfs'
    const path: string | undefined = body.path ?? body.storagePath
    const title: string | undefined = body.title

    if (!path) {
      return new Response(
        JSON.stringify({ error: 'path (or storagePath) is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!
    const doclingApiUrl = Deno.env.get('DOCLING_API_URL')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // ── 1. Download PDF ──────────────────────────────────────────────
    console.log(`[parse-pdf] Downloading ${bucket}/${path}`)
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(path)

    if (downloadError || !fileData) {
      throw new Error(`Failed to download PDF: ${downloadError?.message}`)
    }

    // Convert to base64 – chunked to avoid stack overflow on large files
    const bytes = new Uint8Array(await fileData.arrayBuffer())
    let base64Pdf = ''
    const CHUNK = 8192
    for (let i = 0; i < bytes.length; i += CHUNK) {
      base64Pdf += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
    }
    base64Pdf = btoa(base64Pdf)

    // ── 2. Parse via Docling ─────────────────────────────────────────
    console.log('[parse-pdf] Sending to Docling API')
    const doclingResponse = await fetch(`${doclingApiUrl}/api/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdf_base64: base64Pdf }),
    })

    if (!doclingResponse.ok) {
      const detail = await doclingResponse.text()
      throw new Error(`Docling API failed (${doclingResponse.status}): ${detail}`)
    }

    const parsedDoc = await doclingResponse.json()

    // ── 3. Insert document record ────────────────────────────────────
    console.log('[parse-pdf] Inserting document record')
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        filename: title ?? path.split('/').pop(),
        storage_path: `${bucket}/${path}`,
        parsed_json: parsedDoc,
        user_id: null,
      })
      .select()
      .single()

    if (docError || !document) {
      throw new Error(`Failed to store document: ${docError?.message}`)
    }

    // ── 4. Extract & cap chunks ──────────────────────────────────────
    const allChunks = extractChunks(parsedDoc)
    const chunks = allChunks.slice(0, MAX_CHUNKS)
    console.log(`[parse-pdf] Extracted ${allChunks.length} chunks, processing ${chunks.length}`)

    // ── 5. Batch-embed & insert ──────────────────────────────────────
    let inserted = 0
    for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBED_BATCH_SIZE)
      console.log(`[parse-pdf] Embedding batch ${Math.floor(i / EMBED_BATCH_SIZE) + 1}`)

      const texts = batch.map((c) => c.content.slice(0, 4000))
      const embeddings = await getOpenAIEmbeddings(texts, openaiApiKey)

      const rows = batch.map((chunk, idx) => ({
        document_id: document.id,
        content: chunk.content,
        metadata: chunk.metadata,
        embedding: embeddings[idx],
      }))

      const { error: insertErr } = await supabase.from('chunks').insert(rows)
      if (insertErr) {
        console.error('[parse-pdf] Chunk insert error:', insertErr.message)
      } else {
        inserted += rows.length
      }
    }

    console.log(`[parse-pdf] Done – document_id=${document.id}, chunks=${inserted}`)

    return new Response(
      JSON.stringify({ document_id: document.id, chunks_processed: inserted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[parse-pdf] Error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})

// ── Helpers ────────────────────────────────────────────────────────────

async function getOpenAIEmbeddings(
  texts: string[],
  apiKey: string,
): Promise<number[][]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: texts,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`OpenAI embeddings failed (${response.status}): ${detail}`)
  }

  const data = await response.json()
  // OpenAI may return items out of order; sort by index
  const sorted = (data.data as { index: number; embedding: number[] }[])
    .sort((a, b) => a.index - b.index)
  return sorted.map((d) => d.embedding)
}

export function extractChunks(doc: Record<string, unknown>): DoclingChunk[] {
  const chunks: DoclingChunk[] = []

  try {
    // Extract text blocks
    const texts = doc.texts as { text?: string; prov?: { page_no?: number; bbox?: unknown }[] }[] | undefined
    if (Array.isArray(texts)) {
      for (const t of texts) {
        if (t.text?.trim()) {
          chunks.push({
            content: t.text.trim(),
            metadata: { type: 'text', page: t.prov?.[0]?.page_no, bbox: t.prov?.[0]?.bbox },
          })
        }
      }
    }

    // Extract tables
    const tables = doc.tables as { text?: string; prov?: { page_no?: number; bbox?: unknown }[] }[] | undefined
    if (Array.isArray(tables)) {
      for (const table of tables) {
        if (table.text?.trim()) {
          chunks.push({
            content: table.text.trim(),
            metadata: { type: 'table', page: table.prov?.[0]?.page_no, bbox: table.prov?.[0]?.bbox },
          })
        }
      }
    }

    // Fallback: split main_text into paragraphs
    if (chunks.length === 0 && doc.main_text) {
      const raw = typeof doc.main_text === 'string' ? doc.main_text : JSON.stringify(doc.main_text)
      for (const para of raw.split(/\n\n+/)) {
        if (para.trim()) {
          chunks.push({ content: para.trim(), metadata: { type: 'text' } })
        }
      }
    }
  } catch (error) {
    console.error('[parse-pdf] Error extracting chunks:', error)
  }

  return chunks
}

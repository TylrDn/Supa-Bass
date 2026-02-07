import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DoclingChunk {
  content: string
  metadata: {
    type: string
    page?: number
    bbox?: any
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { storagePath } = await req.json()

    if (!storagePath) {
      throw new Error('storagePath is required')
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!
    const doclingApiUrl = Deno.env.get('DOCLING_API_URL')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Download PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('pdfs')
      .download(storagePath)

    if (downloadError) {
      throw new Error(`Failed to download PDF: ${downloadError.message}`)
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer()
    const base64Pdf = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

    // Send to Docling API
    const doclingResponse = await fetch(`${doclingApiUrl}/api/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdf_base64: base64Pdf }),
    })

    if (!doclingResponse.ok) {
      throw new Error(`Docling API failed: ${doclingResponse.statusText}`)
    }

    const parsedDoc = await doclingResponse.json()

    // Store document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        filename: storagePath.split('/').pop(),
        storage_path: storagePath,
        parsed_json: parsedDoc,
        user_id: null, // For demo purposes; in production, get from JWT
      })
      .select()
      .single()

    if (docError) {
      throw new Error(`Failed to store document: ${docError.message}`)
    }

    // Extract chunks from parsed document
    const chunks = extractChunks(parsedDoc)

    // Limit to 50 chunks for demo speed
    const limitedChunks = chunks.slice(0, 50)

    // Generate embeddings and store chunks
    for (const chunk of limitedChunks) {
      try {
        const embedding = await getOpenAIEmbedding(chunk.content, openaiApiKey)

        await supabase.from('chunks').insert({
          document_id: document.id,
          content: chunk.content,
          metadata: chunk.metadata,
          embedding: embedding,
        })
      } catch (error) {
        console.error('Failed to process chunk:', error)
        // Continue with other chunks
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        documentId: document.id,
        chunksProcessed: limitedChunks.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

async function getOpenAIEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API failed: ${response.statusText}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

function extractChunks(doc: any): DoclingChunk[] {
  const chunks: DoclingChunk[] = []

  try {
    // Extract text blocks
    if (doc.texts && Array.isArray(doc.texts)) {
      for (const text of doc.texts) {
        if (text.text && text.text.trim()) {
          chunks.push({
            content: text.text.trim(),
            metadata: {
              type: 'text',
              page: text.prov?.[0]?.page_no,
              bbox: text.prov?.[0]?.bbox,
            },
          })
        }
      }
    }

    // Extract tables
    if (doc.tables && Array.isArray(doc.tables)) {
      for (const table of doc.tables) {
        if (table.text && table.text.trim()) {
          chunks.push({
            content: table.text.trim(),
            metadata: {
              type: 'table',
              page: table.prov?.[0]?.page_no,
              bbox: table.prov?.[0]?.bbox,
            },
          })
        }
      }
    }

    // Fallback: extract from main_text if available
    if (chunks.length === 0 && doc.main_text) {
      const text = typeof doc.main_text === 'string' ? doc.main_text : JSON.stringify(doc.main_text)
      const paragraphs = text.split(/\n\n+/)
      
      for (const para of paragraphs) {
        if (para.trim()) {
          chunks.push({
            content: para.trim(),
            metadata: {
              type: 'text',
            },
          })
        }
      }
    }
  } catch (error) {
    console.error('Error extracting chunks:', error)
  }

  return chunks
}

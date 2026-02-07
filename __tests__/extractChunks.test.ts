/**
 * Unit tests for the extractChunks helper used by the parse-pdf Edge Function.
 *
 * Run with:  npx tsx __tests__/extractChunks.test.ts
 *
 * The function is copied (not imported from a Deno module) so these tests
 * run in Node without any Deno shims.
 */

// ── inline copy of the types + function (mirrors supabase/functions/parse-pdf/index.ts) ──

interface DoclingChunk {
  content: string
  metadata: {
    type: string
    page?: number
    bbox?: unknown
  }
}

function extractChunks(doc: Record<string, unknown>): DoclingChunk[] {
  const chunks: DoclingChunk[] = []
  try {
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
    if (chunks.length === 0 && doc.main_text) {
      const raw = typeof doc.main_text === 'string' ? doc.main_text : JSON.stringify(doc.main_text)
      for (const para of raw.split(/\n\n+/)) {
        if (para.trim()) {
          chunks.push({ content: para.trim(), metadata: { type: 'text' } })
        }
      }
    }
  } catch {
    // silently ignore
  }
  return chunks
}

// ── assertions (no test framework needed) ──

function assert(cond: boolean, msg: string) {
  if (!cond) { throw new Error(`FAIL: ${msg}`) }
}

// Test 1: text blocks
{
  const doc = {
    texts: [
      { text: 'Hello world', prov: [{ page_no: 1 }] },
      { text: '  ', prov: [] }, // blank → skipped
      { text: 'Second paragraph', prov: [{ page_no: 2, bbox: { l: 0, t: 0, r: 100, b: 50 } }] },
    ],
  }
  const chunks = extractChunks(doc)
  assert(chunks.length === 2, `Expected 2 text chunks, got ${chunks.length}`)
  assert(chunks[0].content === 'Hello world', 'First chunk content')
  assert(chunks[0].metadata.type === 'text', 'First chunk type')
  assert(chunks[0].metadata.page === 1, 'First chunk page')
  assert(chunks[1].metadata.page === 2, 'Second chunk page')
  console.log('✓ Test 1 – text blocks passed')
}

// Test 2: tables
{
  const doc = {
    texts: [],
    tables: [
      { text: 'Col1 | Col2\n--- | ---\nA | B', prov: [{ page_no: 3 }] },
    ],
  }
  const chunks = extractChunks(doc)
  assert(chunks.length === 1, `Expected 1 table chunk, got ${chunks.length}`)
  assert(chunks[0].metadata.type === 'table', 'Table type')
  assert(chunks[0].metadata.page === 3, 'Table page')
  console.log('✓ Test 2 – tables passed')
}

// Test 3: mixed text + tables
{
  const doc = {
    texts: [{ text: 'Intro', prov: [{ page_no: 1 }] }],
    tables: [{ text: 'Table data', prov: [{ page_no: 2 }] }],
  }
  const chunks = extractChunks(doc)
  assert(chunks.length === 2, `Expected 2 mixed chunks, got ${chunks.length}`)
  assert(chunks[0].metadata.type === 'text', 'Mixed - first is text')
  assert(chunks[1].metadata.type === 'table', 'Mixed - second is table')
  console.log('✓ Test 3 – mixed text + tables passed')
}

// Test 4: fallback to main_text
{
  const doc = { main_text: 'Para one.\n\nPara two.\n\nPara three.' }
  const chunks = extractChunks(doc)
  assert(chunks.length === 3, `Expected 3 fallback chunks, got ${chunks.length}`)
  assert(chunks[0].content === 'Para one.', 'Fallback first para')
  console.log('✓ Test 4 – main_text fallback passed')
}

// Test 5: empty document
{
  const chunks = extractChunks({})
  assert(chunks.length === 0, `Expected 0 chunks from empty doc, got ${chunks.length}`)
  console.log('✓ Test 5 – empty document passed')
}

console.log('\nAll extractChunks tests passed ✅')

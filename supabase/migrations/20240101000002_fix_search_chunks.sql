-- Fix search_chunks: accept a pre-computed embedding vector instead of
-- relying on the non-existent embed() helper.  Also add chunk_id output.
CREATE OR REPLACE FUNCTION search_chunks(
  query_embedding vector(1536),
  doc_id UUID,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  chunk_id UUID,
  content  TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id        AS chunk_id,
    c.content,
    c.metadata,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM chunks c
  WHERE c.document_id = doc_id
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Allow anonymous / public reads on documents and chunks for the demo.
-- The Edge Function uses the service-role key for writes; these policies
-- ensure the search page can read without authentication.
CREATE POLICY IF NOT EXISTS "Allow public read on documents"
  ON documents FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Allow public read on chunks"
  ON chunks FOR SELECT USING (true);

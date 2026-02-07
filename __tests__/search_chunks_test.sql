-- SQL test snippet for search_chunks RPC
-- Run after applying migrations:
--   supabase db reset
--   psql $DATABASE_URL -f __tests__/search_chunks_test.sql
--
-- This test:
--   1. Inserts a document + chunk with a mock embedding (all-zeros vector).
--   2. Calls search_chunks with the same mock embedding.
--   3. Verifies the chunk is returned with similarity ≈ 0 (cosine of zero vectors).

BEGIN;

-- Insert a test document
INSERT INTO documents (id, filename, storage_path)
VALUES ('00000000-0000-0000-0000-000000000001', 'test.pdf', 'pdfs/test.pdf');

-- Insert a chunk with a known embedding (all 0.1 values, 1536 dims)
INSERT INTO chunks (id, document_id, content, metadata, embedding)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'The quick brown fox jumps over the lazy dog.',
  '{"type": "text", "page": 1}'::jsonb,
  (SELECT array_agg(0.1)::vector(1536) FROM generate_series(1, 1536))
);

-- Search with an identical embedding → should return the chunk with high similarity
SELECT
  chunk_id,
  content,
  metadata,
  similarity
FROM search_chunks(
  (SELECT array_agg(0.1)::vector(1536) FROM generate_series(1, 1536)),
  '00000000-0000-0000-0000-000000000001'::uuid,
  5
);

-- Expect: 1 row, similarity close to 1.0

ROLLBACK;  -- Clean up

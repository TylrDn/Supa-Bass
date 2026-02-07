-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  parsed_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chunks table with vector embeddings
CREATE TABLE chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vector similarity index
CREATE INDEX chunks_embedding_idx ON chunks USING ivfflat (embedding vector_cosine_ops);

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents
CREATE POLICY "Users can access own documents" 
  ON documents FOR ALL 
  USING (auth.uid() = user_id);

-- RLS Policies for chunks
CREATE POLICY "Users can access chunks from own documents" 
  ON chunks FOR ALL 
  USING (
    document_id IN (
      SELECT id FROM documents WHERE user_id = auth.uid()
    )
  );

-- Create search function (requires OpenAI embeddings integration)
CREATE OR REPLACE FUNCTION search_chunks(
  query_text TEXT, 
  doc_id UUID, 
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID, 
  content TEXT, 
  metadata JSONB, 
  similarity FLOAT
) 
LANGUAGE sql STABLE
AS $$
  SELECT 
    c.id, 
    c.content, 
    c.metadata,
    1 - (c.embedding <=> embed(query_text)::vector) AS similarity
  FROM chunks c
  WHERE c.document_id = doc_id
  ORDER BY c.embedding <=> embed(query_text)::vector
  LIMIT match_count;
$$;

-- Fix storage RLS policies to allow anonymous uploads for hackathon demo
-- This replaces the authenticated-only policies with public ones

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can upload own PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own PDFs" ON storage.objects;

-- Allow public uploads to pdfs bucket (for demo/hackathon)
CREATE POLICY "Allow public uploads to pdfs bucket"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pdfs');

-- Allow public reads from pdfs bucket
CREATE POLICY "Allow public reads from pdfs bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pdfs');

-- Allow public deletes from pdfs bucket (optional, for cleanup)
CREATE POLICY "Allow public deletes from pdfs bucket"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'pdfs');

-- Note: For production, you should:
-- 1. Enable Supabase Auth
-- 2. Replace these policies with auth.uid() checks
-- 3. Add user ownership to storage paths

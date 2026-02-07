# GitHub Copilot Instructions for Supa-Bass

## Project Overview

Supa-Bass is a PDF Insight Extractor - a Next.js 14 application that enables users to upload PDFs, parse them with Docling AI, store structured data in Supabase, and perform semantic search using OpenAI embeddings.

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + pgvector extension)
- **AI/ML**: Docling API (Python-based PDF parsing), OpenAI text-embedding-ada-002 (1536 dimensions)
- **Deployment**: Vercel (Frontend + Docling API), Supabase Edge Functions
- **Storage**: Supabase Storage with RLS policies

## Architecture

- **Frontend (Next.js 14)**: Server-side rendering with Supabase SSR, upload/search interfaces
- **Database**: PostgreSQL with pgvector for semantic search
  - `documents` table: stores PDF metadata and parsed JSON
  - `chunks` table: stores text chunks with embeddings for semantic search
- **Edge Functions**: Supabase Edge Function for PDF processing orchestration
- **Docling API**: Separate Vercel Python service for PDF parsing

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Follow Next.js 14 App Router conventions

### React Components

- Use functional components with hooks
- Prefer server components by default (Next.js 14)
- Use 'use client' directive only when client-side interactivity is required
- Follow the existing component structure in `src/app/`

### Styling

- Use Tailwind CSS utility classes for styling
- Follow the existing glassmorphism design pattern
- Maintain responsive design patterns
- Use existing color scheme (purple/blue gradients)

### Database

- Always use parameterized queries to prevent SQL injection
- Respect Row Level Security (RLS) policies
- Use the Supabase client from `src/lib/supabase.ts`
- Vector operations use cosine similarity (1 - cosine distance)

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Run extraction test
npm run test:extract
```

## File Structure

- `src/app/`: Next.js App Router pages and API routes
- `src/lib/`: Shared utilities (Supabase client)
- `api/`: Python Docling API service
- `supabase/`: Database migrations and Edge Functions
- `__tests__/`: Test files

## Security Considerations

### Critical Security Rules

1. **Never commit secrets**: API keys must be in `.env.local` (gitignored)
2. **RLS Policies**: All database tables have Row Level Security enabled
3. **Service Role Key**: Only use in Edge Functions (server-side), never in frontend
4. **Anon Key**: Safe for frontend use, respects RLS policies
5. **Storage Bucket**: PDFs stored in private bucket with RLS policies

### Environment Variables

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL (frontend)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key (frontend)
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (Edge Functions only)
- `OPENAI_API_KEY`: OpenAI API key (Edge Functions only)
- `DOCLING_API_URL`: Vercel Docling API URL (Edge Functions only)

## Database Schema

### documents table
- `id`: UUID (primary key)
- `user_id`: UUID (references auth.users)
- `filename`: TEXT
- `storage_path`: TEXT
- `parsed_json`: JSONB (full Docling output)
- `created_at`: TIMESTAMPTZ

### chunks table
- `id`: UUID (primary key)
- `document_id`: UUID (references documents)
- `content`: TEXT
- `metadata`: JSONB (type, page, bbox)
- `embedding`: VECTOR(1536) (pgvector)
- `created_at`: TIMESTAMPTZ

## API Routes

### /api/search
POST endpoint for semantic search
- Input: `{ query_text: string, doc_id?: string, match_count?: number }`
- Returns: Array of matching chunks with similarity scores

### Edge Function: parse-pdf
POST to `/functions/v1/parse-pdf`
- Input: `{ storagePath: string }`
- Orchestrates PDF parsing and embedding generation

## Common Tasks

### Adding a new API route
1. Create file in `src/app/api/[route]/route.ts`
2. Use Supabase SSR client for database access
3. Handle errors appropriately
4. Return proper HTTP status codes

### Modifying database schema
1. Create migration in `supabase/migrations/`
2. Use timestamped filename format: `YYYYMMDDHHMMSS_description.sql`
3. Test migration locally first
4. Deploy with `supabase db push`

### Working with embeddings
- Embeddings are 1536-dimensional vectors from OpenAI
- Use `match_chunks` function for semantic search
- Similarity threshold: typically 0.7-0.8
- Results are ordered by similarity (descending)

## Testing

- Test extraction logic with `npm run test:extract`
- Manual testing recommended for upload/search flows
- Test with various PDF types (text, tables, images)
- Verify RLS policies with different users

## Deployment

### Vercel (Frontend)
```bash
vercel --prod
```
Set environment variables in Vercel Dashboard

### Supabase (Edge Functions)
```bash
supabase functions deploy parse-pdf
supabase secrets set OPENAI_API_KEY=... DOCLING_API_URL=...
```

## Performance Considerations

- PDF parse time: < 30 seconds
- Search response: < 2 seconds
- PDF size limit: 10MB
- Batch embed up to 50 chunks at a time
- Use appropriate indexes on database queries

## Debugging Tips

- Check Supabase Dashboard for logs (Edge Functions, Database)
- Use browser DevTools for frontend debugging
- Verify environment variables are set correctly
- Test Docling API separately if parsing fails
- Check storage bucket permissions if upload fails

## Contributing Guidelines

This is a hackathon MVP project. When making changes:
- Maintain the existing architecture patterns
- Keep the UI consistent with glassmorphism design
- Document any new environment variables needed
- Update README.md if adding major features
- Respect the minimalist approach - avoid over-engineering

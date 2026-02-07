# PDF Insight Extractor

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/import/project?template=https://github.com/TylrDn/Supa-Bass)
![Supabase](https://img.shields.io/badge/Supabase-pgvector-3ecf8e?logo=supabase)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs)

A hackathon-ready MVP that allows users to upload PDFs, parse them with Docling AI, store structured data in Supabase, and perform semantic search using OpenAI embeddings.

## Features

- 📄 **PDF Upload**: Upload PDF documents up to 10MB
- 🤖 **AI-Powered Parsing**: Extract text, tables, and layout using Docling
- 🔍 **Semantic Search**: Search through documents with natural language queries
- 📊 **Structured Data**: Store and retrieve parsed content with metadata
- 🎨 **Modern UI**: Beautiful, responsive interface with Tailwind CSS

## Architecture

### Frontend (Next.js 14)
- Upload interface for PDF files
- Search interface with similarity scoring
- Server-side rendering with Supabase SSR

### Backend (Supabase)
- PostgreSQL with pgvector extension
- Edge Functions for PDF processing
- Storage for PDF files
- Row Level Security (RLS) policies

### AI Services
- **Docling API**: Python-based PDF parsing service (Vercel)
- **OpenAI**: text-embedding-ada-002 for semantic embeddings (1536 dims)

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ and npm
- Supabase account
- OpenAI API key
- Vercel account (for Docling API)

### 2. Clone and Install

```bash
git clone <repository-url>
cd Supa-Bass
npm install
```

### 3. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the database migrations:
   - Go to SQL Editor in Supabase Dashboard
   - Execute `supabase/migrations/20240101000000_initial_schema.sql`
   - Execute `supabase/migrations/20240101000001_storage_setup.sql`
3. Create the storage bucket:
   - Go to Storage in Supabase Dashboard
   - Create a new private bucket named "pdfs"
4. Get your credentials:
   - Project URL: Settings → API → Project URL
   - Anon Key: Settings → API → anon public
   - Service Role Key: Settings → API → service_role (secret!)

### 4. Deploy Docling API

1. Navigate to the `api` directory
2. Deploy to Vercel:
   ```bash
   vercel --prod
   ```
3. Note the deployment URL (e.g., `https://your-project.vercel.app`)

### 5. Deploy Edge Function

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```
2. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```
3. Deploy the function:
   ```bash
   supabase functions deploy parse-pdf
   ```
4. Set environment secrets in Supabase Dashboard:
   - `SUPABASE_URL`: Your Supabase URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `DOCLING_API_URL`: Your Vercel Docling API URL

### 6. Configure Frontend

1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```
2. Edit `.env.local` and add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

### 7. Run Locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 8. Deploy Frontend

Deploy to Vercel:

```bash
vercel --prod
```

Set environment variables in Vercel Dashboard.

## Usage

1. **Upload a PDF**: Click "Select PDF File" and choose a document
2. **Wait for Processing**: The system will parse the PDF and create embeddings
3. **Search**: Enter natural language queries to find relevant content
4. **View Results**: See matching chunks with similarity scores and metadata

## Database Schema

### documents
- `id`: UUID (primary key)
- `user_id`: UUID (references auth.users)
- `filename`: TEXT
- `storage_path`: TEXT
- `parsed_json`: JSONB (full Docling output)
- `created_at`: TIMESTAMPTZ

### chunks
- `id`: UUID (primary key)
- `document_id`: UUID (references documents)
- `content`: TEXT
- `metadata`: JSONB (type, page, bbox)
- `embedding`: VECTOR(1536)
- `created_at`: TIMESTAMPTZ

## API Endpoints

### Edge Function: parse-pdf
POST to `https://<project-ref>.supabase.co/functions/v1/parse-pdf`
```json
{
  "storagePath": "path/to/file.pdf"
}
```

### Docling API: /api/parse
POST to `https://<your-api>.vercel.app/api/parse`
```json
{
  "pdf_base64": "base64-encoded-pdf-content"
}
```

## Performance

- PDF parse time: < 30 seconds
- Search response: < 2 seconds
- Support PDFs up to 10MB
- Batch embed up to 50 chunks (configurable)

## Technologies

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + pgvector)
- **AI/ML**: Docling, OpenAI text-embedding-ada-002
- **Deployment**: Vercel (Frontend + Docling API), Supabase Edge Functions

## 3-Minute Demo Script

1. **Upload** – Open the app, select a PDF (e.g. `demo/finance-q4.pdf`), and click "Upload & Parse".
2. **Wait** – Watch the status progress: upload → Docling parse → embedding → done (~20 s).
3. **Search** – You're redirected to the search page. Type a natural-language question (e.g. "What was Q4 revenue?").
4. **Explore** – Results appear as glassmorphism cards with similarity %, chunk type (text/table), and page number.
5. **Repeat** – Try another query or upload a second PDF.

### Test Commands

```bash
# ── curl: test Edge Function locally ──
curl -X POST http://localhost:54321/functions/v1/parse-pdf \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"bucket":"pdfs","path":"demo/finance-q4.pdf"}'

# ── curl: test /api/search ──
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query_text":"revenue","doc_id":"<DOC_UUID>","match_count":5}'

# ── curl: test Docling API ──
curl -X POST http://localhost:8000/api/parse \
  -H "Content-Type: application/json" \
  -d '{"pdf_base64":"<BASE64_PDF>"}'
```

### Local Development

```bash
# 1) Supabase local
supabase start && supabase db reset

# 2) FastAPI for Docling
python -m venv .venv && source .venv/bin/activate
pip install -r api/requirements.txt
uvicorn api.parse:app --reload --port 8000 &

# 3) Edge Functions
supabase functions serve parse-pdf --no-verify-jwt --env-file .env.local &

# 4) Next.js dev
npm run dev
```

### Deploy to Production

```bash
# Vercel (frontend + Docling API)
vercel --prod

# Supabase DB push + Edge deploy
supabase db push
supabase functions deploy parse-pdf
supabase secrets set OPENAI_API_KEY=sk-... DOCLING_API_URL=https://...vercel.app
```

## Security

- Row Level Security (RLS) enabled on all tables
- Private storage bucket with RLS policies
- API keys stored in environment variables
- Service role key only in Edge Functions

## License

MIT

## Contributing

This is a hackathon project. Feel free to fork and customize!

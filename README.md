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

### Prerequisites

- Node.js 18+ and npm
- Supabase account (or local Supabase via Docker)
- OpenAI API key
- Python 3.8+ (for Docling API)
- Vercel account (for Docling API deployment)

### Quick Start (Automated)

```bash
# Clone and install
git clone <repository-url>
cd Supa-Bass
npm install

# Run setup script
./setup-local.sh

# Follow the prompts to configure .env.local
```

### Manual Setup

#### 1. Install Dependencies

```bash
npm install
```

#### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Server-side keys (used by /api/search route)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-api-key
```

#### 3. Set Up Supabase

**Option A: Cloud Supabase**

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the database migrations in SQL Editor:
   - Execute `supabase/migrations/20240101000000_initial_schema.sql`
   - Execute `supabase/migrations/20240101000001_storage_setup.sql`
   - Execute `supabase/migrations/20240101000002_fix_search_chunks.sql`
   - Execute `supabase/migrations/20240101000003_fix_storage_rls.sql`
3. Get your credentials from Settings → API
4. Storage bucket `pdfs` will be created automatically by the migration

**Option B: Local Supabase (Recommended for Development)**

```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase (requires Docker)
supabase start

# This will output local credentials - update your .env.local

# Run migrations
supabase db reset

# Your local Supabase is now running at http://localhost:54321
```

#### 4. Deploy Docling API (Production) or Run Locally

**For Production (Vercel):**

```bash
cd api
vercel --prod
# Note the deployment URL (e.g., https://supa-bass-docling.vercel.app)
```

**For Local Development:**

```bash
# Install Python dependencies
cd api
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Run locally
uvicorn parse:app --reload --port 8000

# Docling API will be available at http://localhost:8000
```

#### 5. Deploy Edge Function

**For Production:**

```bash
# Link your Supabase project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy parse-pdf

# Set environment secrets in Supabase Dashboard → Edge Functions → parse-pdf:
# - SUPABASE_URL: Your Supabase URL
# - SUPABASE_SERVICE_ROLE_KEY: Your service role key
# - OPENAI_API_KEY: Your OpenAI API key
# - DOCLING_API_URL: Your Vercel Docling API URL
```

**For Local Development:**

```bash
# Ensure .env.local has all required variables
supabase functions serve parse-pdf --env-file .env.local --no-verify-jwt

# Edge Function will be available at http://localhost:54321/functions/v1/parse-pdf
```

#### 6. Run the Frontend

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

#### 7. Run Smoke Test

```bash
./smoke-test.sh
```

This will verify that all components are working together correctly.

### One-Command Local Development

Once everything is configured, you can start all services with:

```bash
# Terminal 1: Supabase
supabase start && supabase db reset

# Terminal 2: Docling API (optional for local development)
cd api && source .venv/bin/activate && uvicorn parse:app --reload --port 8000

# Terminal 3: Edge Function
supabase functions serve parse-pdf --env-file .env.local --no-verify-jwt

# Terminal 4: Next.js
npm run dev
```

Or simply use cloud services (Supabase Cloud + deployed Edge Function) and only run:

```bash
npm run dev
```

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

Perfect for showing judges or stakeholders:

1. **Upload (30s)**
   - Open the app at your deployed URL or localhost:3000
   - Dismiss the demo banner (or read it quickly)
   - Click "Select PDF File" and choose a sample document (resume, financial report, research paper)
   - Click "Upload & Parse PDF"

2. **Wait & Watch (20-30s)**
   - Status updates show:
     - ✓ Uploading PDF...
     - ✓ Processing PDF with Docling AI...
     - ✓ Generating embeddings...
     - ✓ PDF processed successfully!
   - Automatic redirect to search page

3. **Search & Explore (2min)**
   - Try natural language queries:
     - For resumes: "work experience", "skills", "education"
     - For financial reports: "revenue", "Q4 performance", "expenses"
     - For research papers: "methodology", "key findings", "conclusions"
   - Results appear as glassmorphism cards showing:
     - Similarity percentage (higher = more relevant)
     - Matched text content
     - Metadata (type: text/table, page number)
   - Try multiple queries to demonstrate semantic understanding

4. **Highlight Features**
   - Point out the similarity scores (semantic search in action)
   - Show how table data is extracted separately
   - Mention the tech stack: Docling AI + OpenAI embeddings + Supabase pgvector

**Pro Tips:**
- Use a PDF with varied content (text + tables) to show extraction capabilities
- Prepare 3-4 search queries in advance
- Have the app already loaded to save time

### Sample PDFs for Demo

- Financial Reports: Great for testing "revenue", "profit", "quarterly" queries
- Academic Resumes/CVs: Test "experience", "publications", "education"
- Technical Documentation: Try "API", "configuration", "installation"

### Test Commands (For Technical Judges)

```bash
# Test the Edge Function locally
curl -X POST http://localhost:54321/functions/v1/parse-pdf \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -d '{"path":"test.pdf","bucket":"pdfs"}'

# Test search API
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query_text":"revenue","doc_id":"<DOC_UUID>","match_count":5}'

# Test Docling API
curl -X POST http://localhost:8000/api/parse \
  -H "Content-Type: application/json" \
  -d '{"pdf_base64":"<BASE64_PDF>"}'
```

## Troubleshooting

### Common Issues

**1. "Upload failed: Permission denied"**
- Ensure you've run the latest migration: `20240101000003_fix_storage_rls.sql`
- Check that the `pdfs` bucket exists in Supabase Storage
- Verify storage policies allow public uploads

**2. "Processing failed: Edge function timeout"**
- Large PDFs (>5MB) may take longer
- Check Docling API is deployed and responding
- Verify `DOCLING_API_URL` environment variable is set correctly
- Check Edge Function logs in Supabase Dashboard

**3. "No results found" in search**
- Verify chunks were created: Check `chunks` table in Supabase
- Ensure OpenAI API key is valid and has credits
- Check that embeddings were generated (embedding column not null)

**4. Docling API errors**
- Install required Python packages: `pip install -r api/requirements.txt`
- Ensure `docling` and `docling-core` are installed
- Check Python version (3.8+ required)

**5. Local Supabase won't start**
- Ensure Docker is running
- Check port 54321 is not in use
- Run `supabase stop` and try again

**6. Environment variables not loaded**
- Restart Next.js dev server after changing `.env.local`
- For Edge Functions, pass `--env-file .env.local` flag
- Check variable names match exactly (case-sensitive)

### Debugging Tips

**Enable verbose logging:**

```typescript
// In parse-pdf/index.ts, logs are already enabled with console.log
// Check Supabase Dashboard → Edge Functions → Logs
```

**Check database state:**

```sql
-- Count documents
SELECT COUNT(*) FROM documents;

-- Count chunks per document
SELECT document_id, COUNT(*) as chunk_count 
FROM chunks 
GROUP BY document_id;

-- Check embeddings are present
SELECT COUNT(*) FROM chunks WHERE embedding IS NOT NULL;

-- Test search function manually
SELECT * FROM search_chunks(
  (SELECT embedding FROM chunks LIMIT 1),  -- Use any embedding as test
  'YOUR_DOCUMENT_ID'::uuid,
  5
);
```

**Clear test data:**

```sql
-- Remove all test documents and chunks
DELETE FROM documents;  -- Chunks auto-delete due to CASCADE
```

## Deployment to Production

### 1. Deploy Docling API to Vercel

```bash
cd api
vercel --prod
```

Note the deployment URL (e.g., `https://supa-bass-docling.vercel.app`)

### 2. Set Up Cloud Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run all migrations in SQL Editor (in order)
3. Note your credentials from Settings → API

### 3. Deploy Edge Function

```bash
# Link your Supabase project
supabase link --project-ref your-project-ref

# Deploy
supabase functions deploy parse-pdf

# Set secrets (do this in Supabase Dashboard → Edge Functions)
# Or via CLI:
supabase secrets set OPENAI_API_KEY=sk-your-key
supabase secrets set DOCLING_API_URL=https://your-docling.vercel.app
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Deploy Frontend to Vercel

```bash
vercel --prod
```

Set environment variables in Vercel Dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

### 5. Verify Deployment

1. Visit your Vercel frontend URL
2. Upload a test PDF
3. Verify processing completes
4. Test search functionality

## Security

### Current Setup (Hackathon/Demo Mode)

- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Public read access for documents and chunks (for demo)
- ✅ Public upload to pdfs storage bucket (for demo)
- ✅ API keys stored in environment variables
- ✅ Service role key only used server-side

### For Production Use

**Important:** This hackathon app has public access enabled for ease of demo. For production:

**Important:** This hackathon app has public access enabled for ease of demo. For production:

1. **Enable Authentication:**
   ```typescript
   // In src/app/page.tsx, add auth check
   const { data: { session } } = await supabase.auth.getSession()
   if (!session) {
     // Redirect to login
   }
   ```

2. **Update RLS Policies:**
   ```sql
   -- Remove public policies
   DROP POLICY "Allow public read on documents" ON documents;
   DROP POLICY "Allow public read on chunks" ON chunks;
   DROP POLICY "Allow public uploads to pdfs bucket" ON storage.objects;
   
   -- Add auth-based policies
   CREATE POLICY "Users can access own documents"
     ON documents FOR ALL
     USING (auth.uid() = user_id);
   
   CREATE POLICY "Users can access own chunks"
     ON chunks FOR ALL
     USING (
       document_id IN (
         SELECT id FROM documents WHERE user_id = auth.uid()
       )
     );
   ```

3. **Add Rate Limiting:**
   - Use Vercel Edge Config or Upstash for rate limiting
   - Implement per-user upload quotas

4. **Secure API Keys:**
   - Rotate OpenAI keys regularly
   - Use separate keys for dev/prod
   - Monitor usage in OpenAI dashboard

5. **Add Input Validation:**
   - Validate PDF file size on client and server
   - Scan uploaded files for malware
   - Limit number of documents per user

## Performance Optimization

- **PDF Parsing**: ~20-30 seconds for typical documents
- **Search Response**: < 2 seconds with pgvector
- **Chunk Limit**: Currently capped at 50 chunks per document
- **Batch Embedding**: 20 chunks per OpenAI API call

### Scaling Considerations

- Increase `MAX_CHUNKS` in Edge Function for larger documents
- Use `text-embedding-3-small` (cheaper) if budget is tight
- Consider caching embeddings for repeated queries
- Add pagination to search results for large result sets

## Technologies

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + pgvector + Edge Functions)
- **AI/ML**: [Docling](https://github.com/DS4SD/docling) (IBM), OpenAI text-embedding-ada-002
- **Deployment**: Vercel (Frontend + Docling API), Supabase Cloud
- **Other**: Deno (Edge Functions runtime)

## Project Structure

```
Supa-Bass/
├── api/                      # Docling Python API (FastAPI)
│   ├── parse.py             # PDF parsing endpoint
│   └── requirements.txt     # Python dependencies
├── src/
│   ├── app/
│   │   ├── page.tsx         # Upload page
│   │   ├── search/[docId]/  # Search page
│   │   └── api/search/      # Search API route
│   └── lib/
│       └── supabase.ts      # Supabase SSR client
├── supabase/
│   ├── functions/
│   │   └── parse-pdf/       # Edge Function for orchestration
│   └── migrations/          # Database schema & RLS
├── __tests__/               # Test files
├── setup-local.sh           # Automated setup script
├── smoke-test.sh            # End-to-end test script
└── README.md               # This file
```

## Contributing

This is a hackathon project built for the Supabase AI Hackathon. Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT

## Acknowledgments

- [Docling](https://github.com/DS4SD/docling) by IBM Research for PDF parsing
- [Supabase](https://supabase.com) for the incredible database + edge platform
- [OpenAI](https://openai.com) for embeddings API
- [Next.js](https://nextjs.org) team for the amazing framework

## Support

For issues or questions:
- Open a GitHub issue
- Check the Troubleshooting section above
- Review Supabase Edge Function logs
- Check browser console for frontend errors

---

Built with ❤️ for the Supabase AI Hackathon

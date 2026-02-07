# 🚀 Supa-Bass: Exact Commands to Run

## ⚡ Quick Start (Copy & Paste)

### Step 1: Initial Setup

```bash
# Navigate to project directory
cd /Users/taylordean/Supa-Bass

# Install dependencies (if not already done)
npm install

# Create .env.local from example
cp .env.local.example .env.local

# Edit .env.local and add your credentials:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - OPENAI_API_KEY
```

### Step 2: Database Setup

**Option A: Using Supabase Cloud (Recommended for Quick Demo)**

1. Go to https://supabase.com and create a project
2. In SQL Editor, run these migrations in order:
   ```sql
   -- Copy/paste each file from supabase/migrations/:
   -- 1. 20240101000000_initial_schema.sql
   -- 2. 20240101000001_storage_setup.sql
   -- 3. 20240101000002_fix_search_chunks.sql
   -- 4. 20240101000003_fix_storage_rls.sql (NEW!)
   ```
3. Get credentials from Settings → API and update .env.local

**Option B: Using Local Supabase**

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Start local Supabase (requires Docker running)
supabase start

# This outputs local credentials - add them to .env.local

# Run all migrations
supabase db reset
```

### Step 3: Deploy Docling API (Production) or Run Locally

**For Cloud Demo:**

```bash
# Deploy to Vercel
cd api
vercel --prod

# Note the URL, you'll need it for Edge Function secrets
```

**For Local Development:**

```bash
# Create Python virtual environment
cd api
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run locally
uvicorn parse:app --reload --port 8000

# Keep this terminal open, Docling API runs at http://localhost:8000
```

### Step 4: Deploy/Run Edge Function

**For Cloud:**

```bash
# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy
supabase functions deploy parse-pdf

# Set secrets (either in Dashboard or via CLI)
supabase secrets set OPENAI_API_KEY=sk-your-key
supabase secrets set DOCLING_API_URL=https://your-docling.vercel.app
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**For Local:**

```bash
# In a new terminal
cd /Users/taylordean/Supa-Bass

# Add DOCLING_API_URL to .env.local:
# DOCLING_API_URL=http://localhost:8000  # if running locally
# or: DOCLING_API_URL=https://your-vercel-url.vercel.app

# Run Edge Function
supabase functions serve parse-pdf --env-file .env.local --no-verify-jwt

# Keep this terminal open
```

### Step 5: Start Next.js

```bash
# In a new terminal
cd /Users/taylordean/Supa-Bass

npm run dev

# App starts at http://localhost:3000
```

---

## ✅ Verify Everything Works

### Automated Test

```bash
# Run the smoke test
./smoke-test.sh
```

### Manual Test

1. Open http://localhost:3000
2. Upload a PDF (< 10MB)
3. Wait for processing (~20-30 seconds)
4. Should redirect to search page
5. Enter a query and verify results appear

---

## 🎯 For Live Demo (Minimal Setup)

If you want the quickest setup for a demo:

**Prerequisites:**
- Supabase Cloud project (free tier)
- OpenAI API key
- Deployed Docling API on Vercel

**Commands:**

```bash
# 1. Setup
cd /Users/taylordean/Supa-Bass
cp .env.local.example .env.local
# Edit .env.local with cloud credentials

# 2. Link and deploy Edge Function
supabase link --project-ref YOUR_REF
supabase functions deploy parse-pdf
# Set secrets in Supabase Dashboard

# 3. Run frontend
npm run dev

# Done! Open http://localhost:3000
```

---

## 📱 What You Should See

### Homepage
- Title: "PDF Insight Extractor"
- Blue demo banner (dismissible)
- File upload button
- "How it works" section

### During Upload
Status messages should appear:
```
✓ Uploading PDF...
✓ Processing PDF with Docling AI...
✓ Generating embeddings...
✓ PDF processed successfully!
```

### Search Page
- Search input box
- Glassmorphism cards with purple/blue gradient background
- Results show:
  - Similarity percentage
  - Content preview
  - Metadata (type, page number)

---

## 🐛 If Something Goes Wrong

### Error: "Upload failed: Permission denied"

**Fix:**
```bash
# Run the new migration in Supabase SQL Editor:
-- supabase/migrations/20240101000003_fix_storage_rls.sql
```

### Error: "Processing failed"

**Check:**
1. Docling API is running/deployed
2. `DOCLING_API_URL` is set correctly in Edge Function secrets
3. OpenAI API key is valid
4. PDF is < 10MB

**View logs:**
```bash
# For local Edge Function - check the terminal where it's running

# For cloud - Supabase Dashboard → Edge Functions → Logs
```

### Error: "No results found"

**Debug:**
```bash
# Connect to your database and check:
psql $DATABASE_URL

-- Check chunks were created
SELECT COUNT(*) FROM chunks;

-- Check embeddings exist
SELECT COUNT(*) FROM chunks WHERE embedding IS NOT NULL;
```

### Next.js won't start

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules
npm install

# Try again
npm run dev
```

---

## 🎬 3-Minute Demo Script

**Before Starting:**
- Have app loaded: http://localhost:3000
- Have a sample PDF ready (resume, report, or paper)
- Prepare 3-4 search queries

**Script:**

1. **Intro (30s)**: "This is Supa-Bass, a PDF insight extractor using IBM Docling and Supabase pgvector for semantic search."

2. **Upload (30s)**: 
   - Show demo banner
   - Upload PDF
   - Point out real-time status updates

3. **Search (90s)**:
   - Enter query: "work experience" (for resume) or "revenue" (for report)
   - Show results with similarity scores
   - Try 2-3 more queries
   - Highlight semantic understanding (not just keyword matching)

4. **Tech Stack (30s)**: "Built with Next.js 14, Supabase PostgreSQL with pgvector, IBM Docling for layout-aware parsing, and OpenAI embeddings."

---

## 📊 Architecture Summary

```
User → Upload PDF → Supabase Storage
                       ↓
                  Edge Function
                       ↓
                  Docling API (Vercel)
                       ↓
                  Extract chunks
                       ↓
                  OpenAI Embeddings
                       ↓
              PostgreSQL + pgvector
                       ↓
              Search (cosine similarity)
                       ↓
                  Results to User
```

---

## 📋 Final Checklist

Before demo:
- [ ] All environment variables set in .env.local
- [ ] Database migrations run (4 files)
- [ ] Docling API deployed or running locally
- [ ] Edge Function deployed or running locally
- [ ] Next.js running (`npm run dev`)
- [ ] Smoke test passed
- [ ] Sample PDF ready (< 10MB)
- [ ] Search queries prepared

---

## 🎉 You're Ready!

The app is now production-ready with:
- ✅ Fixed data contracts
- ✅ Proper error handling
- ✅ Storage RLS configured for demo
- ✅ Setup automation scripts
- ✅ Comprehensive documentation
- ✅ Demo instructions in UI
- ✅ Smoke test for verification

**Open http://localhost:3000 and start the demo!** 🚀

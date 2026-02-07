# Deployment Guide

## Prerequisites

Before deploying, ensure you have:
- [ ] Supabase account and project created
- [ ] OpenAI API key
- [ ] Vercel account
- [ ] All code committed to Git

## Step 1: Deploy Docling API to Vercel

```bash
# From project root
cd api
vercel --prod
```

Note the deployment URL (e.g., `https://supa-bass-docling.vercel.app`)

## Step 2: Set Up Supabase Database

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Execute the migrations in order:
   - `supabase/migrations/20240101000000_initial_schema.sql`
   - `supabase/migrations/20240101000001_storage_setup.sql`

## Step 3: Create Storage Bucket

1. Go to Storage in Supabase Dashboard
2. Click "New bucket"
3. Name it `pdfs`
4. Set it as **Private**
5. Save

## Step 4: Deploy Edge Function

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy parse-pdf

# Set environment secrets
supabase secrets set SUPABASE_URL=your-supabase-url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set OPENAI_API_KEY=your-openai-key
supabase secrets set DOCLING_API_URL=https://your-docling-api.vercel.app
```

## Step 5: Deploy Frontend to Vercel

```bash
# From project root
vercel --prod
```

When prompted, set environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key

Or set them in Vercel Dashboard → Project Settings → Environment Variables

## Step 6: Test the Deployment

1. Visit your deployed frontend URL
2. Upload a test PDF
3. Wait for processing
4. Verify search functionality works

## Troubleshooting

### Edge Function fails
- Check logs: `supabase functions logs parse-pdf`
- Verify all secrets are set
- Ensure Docling API URL is accessible

### Upload fails
- Verify storage bucket exists and is named "pdfs"
- Check RLS policies are applied
- Ensure bucket is private

### Search returns no results
- Verify embeddings were generated (check chunks table)
- Ensure search_chunks function is created
- Check that embed() function is available (requires OpenAI integration)

## Production Checklist

- [ ] Docling API deployed to Vercel
- [ ] Database migrations executed
- [ ] Storage bucket created
- [ ] Edge function deployed
- [ ] Edge function secrets set
- [ ] Frontend deployed
- [ ] Environment variables set
- [ ] Test upload works
- [ ] Test search works
- [ ] RLS policies tested

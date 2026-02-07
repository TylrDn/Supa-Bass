#!/bin/bash

# Supa-Bass Local Development Setup Script
# This script helps you set up the project for local development

set -e

echo "🦾 Supa-Bass - Local Development Setup"
echo "======================================"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
  echo "📝 Creating .env.local from example..."
  cp .env.local.example .env.local
  echo "✅ .env.local created"
  echo ""
  echo "⚠️  IMPORTANT: Edit .env.local and add your API keys:"
  echo "   - NEXT_PUBLIC_SUPABASE_URL"
  echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
  echo "   - SUPABASE_SERVICE_ROLE_KEY"
  echo "   - OPENAI_API_KEY"
  echo ""
  read -p "Press Enter after you've added your API keys..."
else
  echo "✅ .env.local already exists"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo ""
  echo "📦 Installing npm dependencies..."
  npm install
  echo "✅ Dependencies installed"
else
  echo "✅ Dependencies already installed"
fi

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo ""
  echo "⚠️  Supabase CLI not found. Installing..."
  npm install -g supabase
  echo "✅ Supabase CLI installed"
else
  echo "✅ Supabase CLI already installed"
fi

echo ""
echo "🎯 Setup Complete! Next Steps:"
echo ""
echo "Option A: Use Local Supabase (Recommended for Development)"
echo "  1. Start local Supabase:"
echo "     $ supabase start"
echo ""
echo "  2. Run migrations:"
echo "     $ supabase db reset"
echo ""
echo "  3. Start Next.js dev server:"
echo "     $ npm run dev"
echo ""
echo "  4. In another terminal, start local Edge Function:"
echo "     $ supabase functions serve parse-pdf --env-file .env.local"
echo ""
echo "Option B: Use Cloud Supabase"
echo "  1. Create a Supabase project at https://supabase.com"
echo "  2. Run migrations in the SQL Editor"
echo "  3. Deploy Edge Function:"
echo "     $ supabase link --project-ref YOUR_PROJECT_REF"
echo "     $ supabase functions deploy parse-pdf"
echo "  4. Set secrets in Supabase Dashboard"
echo "  5. Start Next.js dev server:"
echo "     $ npm run dev"
echo ""
echo "📖 For more details, see README.md"
echo ""

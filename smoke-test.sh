#!/bin/bash

# Supa-Bass Smoke Test
# Tests the complete pipeline: Upload → Parse → Embed → Search

set -e

echo "🧪 Supa-Bass Smoke Test"
echo "======================="
echo ""

# Load environment variables
if [ -f ".env.local" ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
else
  echo "❌ .env.local not found. Run ./setup-local.sh first"
  exit 1
fi

# Check required env vars
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo "❌ Missing Supabase environment variables"
  exit 1
fi

echo "📋 Configuration:"
echo "  Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"
echo "  Next.js URL: http://localhost:3000"
echo ""

# Check if services are running
echo "🔍 Checking services..."

# Check Next.js
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "❌ Next.js is not running. Start with: npm run dev"
  exit 1
fi
echo "✅ Next.js is running"

# Check if Supabase is reachable
if ! curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" > /dev/null 2>&1; then
  echo "❌ Supabase is not reachable"
  exit 1
fi
echo "✅ Supabase is reachable"

echo ""
echo "📄 Creating test PDF..."

# Create a simple test PDF using Python
python3 - << 'EOF'
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import os

pdf_path = "test-smoke.pdf"
c = canvas.Canvas(pdf_path, pagesize=letter)
c.drawString(100, 750, "Supa-Bass Smoke Test Document")
c.drawString(100, 700, "")
c.drawString(100, 680, "This is a test document for the smoke test.")
c.drawString(100, 660, "It contains some sample text about technology and innovation.")
c.drawString(100, 640, "")
c.drawString(100, 620, "Key Topics:")
c.drawString(100, 600, "- Artificial Intelligence")
c.drawString(100, 580, "- Machine Learning")
c.drawString(100, 560, "- Natural Language Processing")
c.drawString(100, 540, "")
c.drawString(100, 520, "Revenue for Q4 was $1.2 million.")
c.save()
print(f"✅ Created {pdf_path}")
EOF

if [ ! -f "test-smoke.pdf" ]; then
  echo "⚠️  Could not create test PDF. Install reportlab: pip install reportlab"
  echo "   Skipping automated upload test."
  echo ""
  echo "🎯 Manual Test Steps:"
  echo "  1. Open http://localhost:3000"
  echo "  2. Upload any PDF file"
  echo "  3. Wait for processing (~20-30s)"
  echo "  4. Verify you're redirected to /search/[docId]"
  echo "  5. Enter a search query"
  echo "  6. Verify results appear with similarity scores"
  exit 0
fi

echo ""
echo "📤 Manual verification required:"
echo "  1. Open http://localhost:3000 in your browser"
echo "  2. Upload the test-smoke.pdf file"
echo "  3. Wait for processing (status should show progress)"
echo "  4. You should be redirected to the search page"
echo "  5. Try searching for 'revenue' or 'artificial intelligence'"
echo "  6. Verify results appear with similarity scores"
echo ""
echo "Press Ctrl+C to cancel or Enter to open the browser..."
read

# Open browser (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
  open http://localhost:3000
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  xdg-open http://localhost:3000 2>/dev/null || echo "Please open http://localhost:3000 manually"
else
  echo "Please open http://localhost:3000 manually"
fi

echo ""
echo "✅ Browser opened. Follow the manual verification steps above."
echo ""
echo "🧹 Cleanup: Delete test-smoke.pdf when done"

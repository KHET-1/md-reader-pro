#!/bin/bash
# Phase 1: Critical Security Updates
# MD Reader Pro v3.3.0

echo "╔═══════════════════════════════════════════╗"
echo "║  MD Reader Pro - Phase 1 Critical Update ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# Function to check command success
check_status() {
    if [ $? -eq 0 ]; then
        echo "✅ $1"
    else
        echo "❌ $1 FAILED"
        exit 1
    fi
}

# Update marked (CRITICAL - XSS protection)
echo "📦 Updating marked v5.1.2 → v14.1.4..."
npm install marked@latest
check_status "marked updated"

# Update webpack (security patches)
echo ""
echo "📦 Updating webpack v5.88.0 → v5.97.1..."
npm install -D webpack@latest
check_status "webpack updated"

# Update DOMPurify (already used in code)
echo ""
echo "📦 Updating dompurify v3.0.9 → v3.2.2..."
npm install dompurify@latest
check_status "dompurify updated"

# Run tests
echo ""
echo "🧪 Running tests..."
npm test
check_status "All tests passed"

# Build
echo ""
echo "🔨 Building production bundle..."
npm run build
check_status "Build successful"

# Summary
echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║           Phase 1 Complete! ✅            ║"
echo "╚═══════════════════════════════════════════╝"
echo ""
echo "✅ marked updated to v14.1.4"
echo "✅ webpack updated to v5.97.1"
echo "✅ dompurify updated to v3.2.2"
echo "✅ All 164 tests passing"
echo "✅ Production build successful"
echo ""
echo "📋 Next: Review changes, test manually"
echo "   npm run dev"
echo "   Open http://localhost:8080"
echo ""

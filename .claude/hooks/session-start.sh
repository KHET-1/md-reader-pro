#!/bin/bash
set -euo pipefail

# Session Start Hook for MD Reader Pro
# This hook installs npm dependencies for Claude Code on the web sessions

# Only run in Claude Code on the web (remote environment)
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  echo "Not running in Claude Code on the web, skipping dependency installation"
  exit 0
fi

echo "🚀 Starting MD Reader Pro session setup..."
echo "📦 Installing npm dependencies..."

# Install dependencies
# Using 'npm install' instead of 'npm ci' to take advantage of container caching
npm install --no-audit --prefer-offline

echo "✅ Dependencies installed successfully"
echo "🎉 Session setup complete! Ready for development."

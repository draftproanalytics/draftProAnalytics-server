#!/bin/bash
# quick-roster-sync.sh - Quick start script for roster data sync

echo "╔══════════════════════════════════════════════════╗"
echo "║   NFL Roster Data Sync - Quick Start            ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

API_BASE="http://localhost:5000"

# Check if backend is running
echo "🔍 Checking if backend is running..."
if ! curl -s ${API_BASE}/health > /dev/null 2>&1; then
    echo "❌ Backend is not running on port 5000"
    echo "   Please start your backend server first: npm run dev"
    exit 1
fi
echo "✅ Backend is running"
echo ""

# Check current status
echo "📊 Checking current roster sync status..."
STATUS=$(curl -s ${API_BASE}/api/roster-sync/status)
echo "$STATUS" | jq '.'
echo ""

# Ask user if they want to proceed
read -p "🚀 Do you want to sync ALL team rosters? This will take ~5 minutes. (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Sync cancelled"
    exit 0
fi

# Start sync
echo ""
echo "⏳ Starting roster sync for all 32 NFL teams..."
echo "   This will take approximately 5-6 minutes..."
echo "   Watch the backend console for progress logs"
echo ""

START_TIME=$(date +%s)

# Run sync with visual progress
curl -X POST ${API_BASE}/api/roster-sync/all \
  -H "Content-Type: application/json" \
  --progress-bar | jq '.'

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "✅ Roster sync completed in ${DURATION} seconds"
echo ""

# Show final status
echo "📊 Final roster status:"
curl -s ${API_BASE}/api/roster-sync/status | jq '.'
echo ""

echo "╔══════════════════════════════════════════════════╗"
echo "║   Next Steps                                     ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "1. Generate team needs analysis:"
echo "   curl -X POST ${API_BASE}/api/team-needs/generate-all \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"seasonYear\": 2026}'"
echo ""
echo "2. View results in browser:"
echo "   http://localhost:5173/team-needs/dashboard"
echo ""
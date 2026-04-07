#!/bin/bash
# Setup script for F1846 Vinyl
# Installs deps, sets up DB, seeds data, and starts the dev server
set -e

echo "F1846 Vinyl - Setup Script"
echo "=========================="

# Check Node.js
if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js is not installed. Install Node.js 22+ first."
  echo "  https://nodejs.org or use nvm: nvm install 22"
  exit 1
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

# Copy env file
if [ ! -f .env.local ]; then
  echo ""
  echo "Creating .env.local from .env.example..."
  cp .env.example .env.local
  echo "  Edit .env.local with your DATABASE_URL, Stripe keys, etc."
fi

# Database setup
echo ""
echo "Setting up database..."
if [ -n "$DATABASE_URL" ] || grep -q "^DATABASE_URL=postgresql" .env.local 2>/dev/null; then
  npm run db:push
  echo "  Database schema pushed."
else
  echo "  WARNING: DATABASE_URL not set. Skipping database setup."
  echo "  Set DATABASE_URL in .env.local, then run: npm run db:push"
fi

# Seed data
echo ""
echo "Seeding sample products..."
if [ -n "$DATABASE_URL" ]; then
  npm run db:seed
else
  echo "  Skipping seed (no database connection)."
fi

echo ""
echo "Setup complete!"
echo "  To start dev server:  npm run dev"
echo "  To open DB admin:     npm run db:studio"
echo "  To build for prod:    npm run build"

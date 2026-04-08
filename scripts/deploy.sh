#!/bin/bash
# Deploy Federico Shop to GitHub + Vercel
# Prerequisites: gh auth login (already done), node installed, env vars ready
set -e

echo "============================================"
echo "  Federico Shop - Deploy to GitHub + Vercel"
echo "============================================"

# Step 1: Verify gh auth
if ! gh auth status &>/dev/null; then
  echo "ERROR: Not authenticated with GitHub."
  echo "Run: gh auth login"
  exit 1
fi

# Step 2: Create repo if not exists
REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
if [ -z "$REMOTE" ]; then
  echo ""
  echo "Creating GitHub repo..."
  REPO_SLUG="F1846/vinyl-marketplace-production"
  gh repo create "$REPO_SLUG" --private --description "Curated electronic music shop for vinyl, cassettes, and CDs" --source=. || \
  gh repo create "vinyl-marketplace-production" --private --description "Curated electronic music shop for vinyl, cassettes, and CDs" --source=.
  git remote add origin "https://github.com/F1846/vinyl-marketplace-production.git" 2>/dev/null || \
  git remote set-url origin "https://github.com/F1846/vinyl-marketplace-production.git"
fi

# Step 3: Push to main
echo ""
echo "Pushing to GitHub..."
git branch -M main
git push -u origin main --force

echo ""
echo "Repo pushed: $(git remote get-url origin)"
echo ""

# Step 4: Deploy to Vercel
if command -v vercel &>/dev/null; then
  echo "Deploying to Vercel..."
  vercel --prod --yes --token="${VERCEL_TOKEN}"
  echo ""
  echo "Deployed!"
else
  echo "Vercel CLI not found. Install with: npm i -g vercel"
  echo "Or connect your repo manually at: https://vercel.com/new"
fi

echo ""
echo "Don't forget to set these environment variables in Vercel:"
echo "  DATABASE_URL"
echo "  STRIPE_SECRET_KEY"
echo "  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
echo "  STRIPE_WEBHOOK_SECRET"
echo "  PAYPAL_CLIENT_ID"
echo "  PAYPAL_CLIENT_SECRET"
echo "  ADMIN_PASSWORD_HASH"
echo "  ADMIN_SESSION_SECRET"
echo "  CHECKOUT_STATE_SECRET"
echo "  RESEND_API_KEY"
echo "  EMAIL_FROM"

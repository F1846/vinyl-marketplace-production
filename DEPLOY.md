# Deploy F1846 Vinyl

## Step 1: Create GitHub Repository

```bash
# On GitHub.com:
# 1. Go to https://github.com/new
# 2. Create repo: f1846/vinyl-marketplace-production (private or public)
# 3. Copy the remote URL

# Then run:
git remote add origin https://github.com/F1846/vinyl-marketplace-production.git
git branch -M main
git push -u origin main
```

## Step 2: Set Up Vercel

```bash
# Install Vercel CLI (optional)
npm i -g vercel

# Connect to Vercel
vercel
# Choose your GitHub repo when prompted

# Add environment variables in Vercel dashboard:
# Settings > Environment Variables:
#   DATABASE_URL (Vercel Postgres / Neon / Supabase)
#   STRIPE_SECRET_KEY
#   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
#   STRIPE_WEBHOOK_SECRET
#   SHIPPING_RATE_CENTS
#   ADMIN_PASSWORD
#   RESEND_API_KEY
#   EMAIL_FROM
#   BLOB_READ_WRITE_TOKEN (if using Vercel Blob)
```

## Step 3: Set Up Database

```bash
# After getting DATABASE_URL from Vercel/Neon/Supabase:
npm run db:push

# Or run migration:
npm run db:migrate

# Then seed sample data:
npm run db:seed
```

## Step 4: Configure Stripe Webhook

```bash
# For production, add endpoint in Stripe Dashboard:
# Developers > Webhooks > Add endpoint
# URL: https://your-domain.vercel.app/api/webhooks/stripe
# Events: checkout.session.completed

# Copy the webhook signing secret to Vercel env var:
# STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
```

## Step 5: Set Up Stripe Checkout Redirects

```bash
# In Stripe Dashboard:
# Settings > Payment experience > Checkout settings
# Success URL: https://your-domain.vercel.app/order-confirmation?session_id={CHECKOUT_SESSION_ID}
# Cancel URL: https://your-domain.vercel.app/cart
```

## Step 6: Deploy

Push to main and GitHub Actions will automatically deploy:

```bash
git add .
git commit -m "update"
git push origin main
```

The workflow:
1. CI runs: lint, typecheck, build
2. Deploy job deploys to Vercel production

## Step 7: Add Admin Password

Generate a bcrypt hash locally:

```bash
npm run admin:hash-password -- "your-strong-password"
```

Set `ADMIN_PASSWORD` and `ADMIN_PASSWORD_HASH` in the Vercel dashboard to the same password pair.
Navigate to `/admin/login` to access the admin panel.

## Local Development

```bash
npm install
cp .env.example .env.local
# Edit .env.local
npm run dev
```

# ☕ Baristar — Your name. Destroyed with love.

> Find out what a barista would write on your coffee cup — powered by GPT-4o-mini and FLUX.1 image generation.

## What it does

1. Enter your name → barista AI misspells it 3 ways (GPT-4o-mini)
2. FLUX.1 [schnell] generates a photorealistic coffee cup image
3. Misspelled name overlaid via CSS `Permanent Marker` font (guarantees legibility)
4. Share on Instagram / X, or upload your real barista fail to the community Wall of Shame

## Stack

- **Framework:** Next.js 15 (App Router, TypeScript)
- **Styling:** Tailwind CSS + Google Fonts (Permanent Marker, Playfair Display, Inter)
- **Misspellings:** OpenAI GPT-4o-mini (`$0.0002/request` — basically free)
- **Image gen:** fal.ai FLUX.1 [schnell] (`$0.003/image`)
- **DB (local dev):** SQLite via better-sqlite3
- **DB (production):** Cloudflare D1
- **Storage (production):** Cloudflare R2 (10GB free, zero egress)
- **Hosting:** Cloudflare Pages

## Quick start

```bash
# 1. Clone and install
cd projects/coffee-name/baristar
npm install

# 2. Set up env (already done if .env.local exists)
cp .env.example .env.local
# Edit .env.local and add your keys

# 3. Run dev server
npm run dev
# → http://localhost:3000
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | ✅ Yes | GPT-4o-mini for name misspellings |
| `FAL_KEY` | ✅ Yes | fal.ai FLUX.1 [schnell] image generation |
| `CLOUDFLARE_ACCOUNT_ID` | Prod only | For D1 + R2 |
| `CLOUDFLARE_R2_ACCESS_KEY` | Prod only | R2 storage |
| `CLOUDFLARE_R2_SECRET_KEY` | Prod only | R2 storage |
| `CLOUDFLARE_R2_BUCKET_NAME` | Prod only | Default: `baristar` |

**Getting keys:**
- OpenAI: https://platform.openai.com/api-keys
- fal.ai: https://fal.ai/dashboard — sign up, create API key, store in 1Password as `"fal.ai API Key"`

## API routes

### `POST /api/generate`
Generate misspellings + cup image for a name.

```json
// Request
{ "name": "Sarah" }

// Response
{
  "sessionId": "uuid",
  "misspellings": [
    { "name": "Saarahh", "excuse": "My hand slipped twice.", "rank": 1 },
    { "name": "Serah", "excuse": "The espresso machine was loud.", "rank": 2 },
    { "name": "Sarah-Mae", "excuse": "I felt you deserved a middle name.", "rank": 3 }
  ],
  "imageUrl": "/generated/cup-xxx.jpg",
  "primaryMisspelling": "Saarahh",
  "originalName": "Sarah"
}
```

### `GET /api/gallery`
Returns community uploads (last 20, most recent first).

Query params: `limit` (max 50), `offset`

### `POST /api/upload`
Multipart form upload: `photo` (File), `originalName`, `misspelledName`, `caption`, `sessionId` (optional)

### `GET /api/session/[id]`
Retrieve a session by ID (used by result page).

### `POST /api/gallery/[id]/vote`
Upvote a gallery entry.

## Routes / Pages

| Route | Description |
|---|---|
| `/` | Landing — name input + gallery teaser |
| `/result/[sessionId]` | Generated result — cup image, misspellings, share buttons |
| `/gallery` | Community Wall of Shame — VS compare grid |

## Dev notes

- **SQLite** lives at `baristar.db` in the project root (gitignored)
- **Generated images** saved to `public/generated/` (gitignored)
- **Uploaded photos** saved to `public/uploads/` (gitignored)
- Both directories have `.gitkeep` to preserve them in git
- No auth — gallery is public, uploads are unmoderated (basic size/type validation only)
- IP rate limiting: TODO for production (add Cloudflare WAF rule or middleware)

## Production deployment (Cloudflare Pages)

```bash
# Install Wrangler
npm install -g wrangler

# Create D1 database
wrangler d1 create baristar-db

# Create R2 bucket
wrangler r2 bucket create baristar

# Deploy
npm run build
wrangler pages deploy .next
```

## Cost estimate (10k users/day)

| Service | Cost/month |
|---|---|
| GPT-4o-mini (misspellings) | ~$18 |
| fal.ai FLUX.1 schnell (images, with 60% cache hit) | ~$360 |
| Cloudflare Pages + Workers | ~$5–20 |
| Cloudflare R2 (20GB images) | ~$0.30 |
| **Total** | **~$385/month** |

With name caching (same name = cached image), popular names like "Sarah" and "James" are free on repeat.

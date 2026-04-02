# Matchmaking Studio

AI-first private matchmaking workspace for matchmakers and admins.

## Overview

Matchmaking Studio is a Next.js 16 + Supabase application built around one core workflow:

1. Upload a conversation recording
2. Transcribe audio into text
3. Extract structured profile fields with AI
4. Incrementally update the customer profile
5. Re-run matching and generate follow-up suggestions

The product is designed for matchmakers, not end users. The system defaults to AI auto-writeback, while matchmakers mainly handle conflicts, sensitive confirmations, and low-confidence exceptions.

## Stack

- Next.js 16 (App Router)
- Tailwind CSS 4
- shadcn/ui
- Supabase Auth / Postgres / Storage
- Yunwu-compatible AI gateway for transcription and structured extraction

## Local Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Run the production server locally:

```bash
npm run start
```

Run tests:

```bash
npm test
```

Seed local demo data:

```bash
npm run seed:local-demo
```

## Environment

Use standard `.env` / `.env.local` files.

Key groups used by the app:

- Supabase project URL and keys
- Yunwu Whisper gateway key
- Yunwu Claude gateway key

See deployment and integration details in:

- [docs/deployment.md](/Users/myandong/Projects/marry2/docs/deployment.md)
- [docs/plan.md](/Users/myandong/Projects/marry2/docs/plan.md)
- [docs/todo.md](/Users/myandong/Projects/marry2/docs/todo.md)

## Product Docs

- Detailed product and technical plan: [docs/plan.md](/Users/myandong/Projects/marry2/docs/plan.md)
- Executable implementation checklist: [docs/todo.md](/Users/myandong/Projects/marry2/docs/todo.md)
- API integration notes: [docs/API](/Users/myandong/Projects/marry2/docs/API)

## Current Direction

The current product direction is:

- AI-first structured intake
- high-signal field system
- sensitive tri-state handling (`yes / no / unknown`)
- `confirmed / pending_confirmation / rejected` match recommendation flow
- private, advisor-style UI for high-quality matchmaking operations

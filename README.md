# SparkyFi - AI Financial Advisor

> Submitted as the runnable baseline for the CSE598 Capstone Project Proposal.

SparkyFi is an AI-powered financial advisor that makes financial products accessible to everyone, students, gig workers, and underserved communities. Powered by Sparky, ASU's mascot, it combines real-time financial analysis with a CFPB knowledge base to deliver personalized, actionable financial guidance.

- **Live Website Link :** https://sparkyfi.vercel.app/
- **Repository:** https://github.com/sreeram2001/CSE598-Agentic-AI-Project-Proposal

---

## The Problem

Millions of Americans lack access to financial advisors. They sign leases without understanding them, carry the wrong insurance, and make costly financial decisions due to lack of knowledge not lack of intelligence.

## The Solution

SparkyFi, an AI Financial Advisor Tool gives everyone a financial advisor in their pocket:

- **Talk to Sparky** : voice or text, get instant personalized financial advice
- **Upload any document** : Lease, Insurance policy, Bank statement, credit card statement loan agreement - get simple analysis with red flags, green flags and action items
- **Live financial dashboard** : risk score, spending breakdown, emergency alerts, savings opportunities
- **Insurance Intelligence** : RAG-powered recommendations grounded in CFPB data and State Farm product data
- **Connect your bank** : Plaid sandbox integration for real transaction data

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS, Framer Motion, Recharts |
| AI | Google Gemini 2.5 Flash (chat + PDF vision) |
| RAG | Pinecone vector DB with built-in `llama-text-embed-v2` inference (optional) |
| Voice Input | Web Speech API (browser) |
| Voice Output | ElevenLabs TTS (optional) |
| Bank Data | Plaid Sandbox (optional) |
| Persistence | Supabase (optional) |
| Deployment | Vercel |

---

## Repository Layout

```
sparkyfi/
├── app/
│   ├── page.tsx                    # Main UI (chat + dashboard, boots with mock data)
│   ├── layout.tsx, globals.css
│   └── api/
│       ├── chat/                   # Core baseline: Sparky Q&A (Gemini + RAG)
│       ├── analyze-pdf/            # PDF vision analysis (Gemini)
│       ├── insurance-insights/     # Personalized insurance recommendations (Gemini + RAG)
│       ├── voice/                  # Text-to-speech (ElevenLabs)
│       ├── plaid/                  # Plaid sandbox link + token exchange
│       ├── seed-rag/               # Seed the built-in knowledge base into Pinecone
│       ├── save-chat/, user-data/  # Supabase persistence
├── lib/
│   ├── gemini.ts                   # Gemini chat, financial-profile + PDF analysis
│   ├── pinecone.ts                 # RAG query + static-knowledge-base fallback
│   ├── mockData.ts                 # Default profile/transactions used on first load
│   ├── supabase.ts, userSession.ts, types.ts
├── components/                     # ChatPanel, Dashboard, etc.
├── scripts/                        # Optional crawlers to build the full RAG corpus
├── .env.template                   # Env var names (copy to .env.local)
└── supabase-schema.sql             # Optional Supabase table schema
```

---

## Quick Start (Baseline — recommended for reproducing)

The **core baseline** is the "Talk to Sparky" chat: ask a financial question and get grounded, actionable advice. **It requires only one API key (`GEMINI_API_KEY`).** All other integrations are optional — if Pinecone is unavailable, the RAG layer automatically falls back to a built-in State Farm / CFPB knowledge base (`lib/pinecone.ts`), so chat still returns grounded answers.

### Prerequisites
- Node.js 18+ (developed and tested on Node 22)
- npm
- A Google Gemini API key — free from https://aistudio.google.com

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Create your env file and add your Gemini key
cp .env.template .env.local
# Edit .env.local and set: GEMINI_API_KEY=your_key_here

# 3. Run the dev server
npm run dev
```

Open http://localhost:3000. The dashboard loads and the chat panel is ready to use.

---

## Concrete Test Case + Expected Output

With `GEMINI_API_KEY` set and the dev server running, call the chat endpoint:

**Input**

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Do I need renters insurance as a student?","history":[],"financialContext":""}'
```

**Actual output (example run)**

```json
{
  "response": "As a student, yes, renters insurance is a smart move! Your landlord's insurance won't cover your personal belongings (like your laptop, furniture, or clothes) if there's theft, fire, or water damage.\n\n*   It also protects you financially if someone gets injured in your apartment.\n*   It's usually very affordable, around $12-18 a month.\n*   **Action for today:** Check with your parents to see if their homeowners policy already covers you, or get a quick quote for State Farm Renters Insurance online."
}
```

The exact wording will vary between runs (the model is generative), but every response is short, actionable, grounded in the State Farm / CFPB knowledge base, and ends with one concrete next step as per the system prompt in `lib/gemini.ts`.

You can also test the same question through the UI at http://localhost:3000 by typing it into the chat panel.

---

## Full Setup (all features)

To enable RAG over Pinecone, voice output, bank connection, and persistence, add these to `.env.local` (see `.env.template`):

| Variable | Purpose | Required for |
|----------|---------|--------------|
| `GEMINI_API_KEY` | Gemini chat, PDF vision, insights | **Baseline (required)** |
| `PINECONE_API_KEY`, `PINECONE_INDEX_HOST` | Vector search over the knowledge base | RAG (optional; falls back to static KB) |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` | Spoken responses | Voice output (optional) |
| `PLAID_CLIENT_ID`, `PLAID_SANDBOX_SECRET`, `PLAID_ENV` | Bank transaction data | Bank connect (optional) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Save chats / user data | Persistence (optional) |

### Seeding the knowledge base (optional)

The `seed-rag` endpoint upserts the built-in knowledge base documents (defined in `lib/pinecone.ts`) into your Pinecone index named `rag`:

```bash
curl -X POST http://localhost:3000/api/seed-rag
```

To build the larger Financial / CFPB corpus (2,800+ records), run the crawler in `scripts/` (slow, network-dependent, optional):

```bash
node scripts/crawl-full.js
```

### Trying the full experience

1. **Connect a bank (Plaid sandbox):** click "Connect Bank", use sandbox credentials `user_good` / `pass_good`, MFA `1234`. Transactions load and the dashboard populates.
2. **Upload a document:** upload a bank statement, lease, insurance policy, or loan agreement. Bank statements populate the dashboard; leases/policies surface red flags and action items.
3. **Talk to Sparky:** click the mic and speak, or type. Responses come back as text (and voice if ElevenLabs is configured).

---

## API Endpoints

| Route | Method | Description | Keys used |
|-------|--------|-------------|-----------|
| `/api/chat` | POST | Sparky's financial Q&A (the baseline) | Gemini (+ Pinecone optional) |
| `/api/analyze-pdf` | POST | Extract transactions / analyze documents | Gemini (+ Pinecone optional) |
| `/api/insurance-insights` | POST | Personalized insurance recommendations | Gemini (+ Pinecone optional) |
| `/api/voice` | POST | Text-to-speech audio | ElevenLabs |
| `/api/plaid/create-link-token` | POST | Start Plaid Link | Plaid |
| `/api/plaid/exchange-token` | POST | Exchange public token, fetch transactions | Plaid |
| `/api/seed-rag` | POST | Seed built-in KB docs into Pinecone | Pinecone |
| `/api/save-chat`, `/api/user-data` | POST/GET | Persist chats / user data | Supabase |

---

## Notes on Reproducibility & Security

- **Baseline requires only `GEMINI_API_KEY`.** The chat endpoint returns grounded answers even without Pinecone, thanks to the static knowledge-base fallback in `lib/pinecone.ts`.
- **Never commit real API keys.** `.gitignore` already excludes `.env*`. Keep secrets in `.env.local` only, and provide any keys the grader needs privately (not in the public repo).
- After grading, rotate/revoke any keys that were shared.
```
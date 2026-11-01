# Hermesian

A media literacy platform: a daily news digest, a TikTok-style scroll feed of news videos, an article analyzer (bias, rhetoric, claims to check), and AI debate practice.

Built with Next.js, Firebase (Auth + Firestore), and Claude / Gemini / Groq.

## Setup

```bash
cp .env.example .env.local   # then fill in your keys
npm install
npm run dev
```

Open http://localhost:3000.

## Notes

- Never commit `.env.local` or API keys. If a key was ever committed, rotate it.
- `src/middleware.ts` only checks that a Firebase ID token cookie is present and unexpired; it does not verify the signature. Protect data with Firestore security rules.
- AI routes are rate limited in memory (`src/lib/apiGuard.ts`); use a shared store if you deploy multiple instances.
- See `GEMINI_INTEGRATION.md` and `SCROLL_FEED_IMPLEMENTATION.md` for feature details.

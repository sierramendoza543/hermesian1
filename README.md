# Hermesian

A media-literacy platform. It groups coverage from dozens of outlets into single **stories**, plots every outlet on the political spectrum, and uses AI to expose bias with **verified quotes**.

- **Stories** — multi-source stories from Google News feeds, with a spectrum chart, coverage breakdown, and an AI brief (agreement, disagreement, framing).
- **Bias X-ray** — paste a link or text. Lean score, loaded language, fallacies, claims to check, sourcing and framing — every quote verified against the original text; plus measured text metrics.
- **Games** — News Quiz, Spot the Bias, Fact or Fake, built from today's stories.
- **Accounts** — Firebase Auth + Firestore: saved stories/analyses, scores, streaks, badges.

## Run locally

```bash
cp .env.example .env.local   # fill in keys
npm install
npm run dev
```

## Set up accounts (Firebase)

1. Firebase console → **Authentication → Sign-in method → Email/Password → Enable**.
2. **Firestore Database → Create database** (production mode), then **Rules** → paste the contents of `firestore.rules` → **Publish**.
3. Put the web-app config values in `.env.local` (and later in Vercel environment variables).

## Notes

- Outlet leans in `src/lib/outlets.ts` are approximate, synthesized from public media-bias rating projects.
- AI helper (`src/lib/llm.ts`) falls back across Claude → Gemini → Groq. Games and the analyzer still produce data-driven output if all AI providers are down.
- Never commit `.env.local`. AI routes are rate limited in memory (`src/lib/apiGuard.ts`).
- `npm run lint` and `npm run build` both pass.

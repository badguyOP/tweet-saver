# Tweet Saver (Next.js + Netlify)
1. `npm install && npm run dev` to test locally (http://localhost:3000)
2. Push to GitHub, then Netlify > Add new site > Import from Git. Build settings come from netlify.toml.
3. API routes use the edge runtime, so Netlify runs them as Edge Functions (streamed responses).
Test a large video download after deploying. If it fails, check Netlify's current Edge Function limits.

# tweet-saver

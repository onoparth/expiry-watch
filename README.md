# EXPIRY WATCH

A React + Vite expiry-tracking app with a Gemini-powered assistant called EXPI.

## Deploy to Netlify

1. Upload this project to a GitHub repository, then import that repository in Netlify (or deploy with the Netlify CLI).
2. Netlify detects `netlify.toml` and builds the React site from `npm run build`.
3. In Netlify: **Project configuration → Environment variables**, add `GEMINI_API_KEY` with your Google AI Studio API key. Give it **Functions** scope (or All scopes).
4. Trigger a new deploy after adding the key.
5. Open the deployed site. EXPI's backend runs as a Netlify Function; the key is never placed in browser code.

## Run locally on macOS

1. Install Node.js 20 or newer.
2. Open Terminal in this folder and run `npm install`.
3. Copy `.env.example` to `.env` and add your Gemini key.
4. Run `npm run dev` and open `http://localhost:5173`.

The local development server uses the Express backend in `server/`. Netlify production uses `netlify/functions/api.mjs`.

## Current prototype behavior

- Add, search, filter and delete products; view expiry statuses and dashboard summaries.
- Inventory is stored in the current browser's localStorage. It is not synced across devices or accounts.
- EXPI provides advice and Q&A about the inventory; it does not add/delete products for you.
- The starter list is demo data; remove it and add your own products.
- Do not rely on this app alone for food, medicine or product safety decisions. Follow packaging instructions and ask a qualified professional when appropriate.

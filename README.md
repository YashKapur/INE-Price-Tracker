# INE Product Price Tracker — Draft

A full-stack draft for the INE Software Engineer Intern assignment. It uses React/Vite, Express, Supabase/PostgreSQL, Playwright/Cheerio, and an external cron trigger.

> Important: the provided mock store was not reachable from the development environment while this draft was generated. Therefore the scraper selectors/search logic are deliberately written as an adaptable baseline and **must be validated against the live INE store before submission**.

## Architecture

React (Vercel) → Express API (Render) → Supabase

cron-job.org → `POST /api/scrape/run` every 2 hours

## Local setup

### 1. Database
Run `supabase/schema.sql` in the Supabase SQL editor.

### 2. Backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### 4. Headed demo
After at least one product is tracked:
```bash
cd backend
npx playwright install chromium
npm run scrape:headed
```

## Environment variables

Backend: `PORT`, `STORE_BASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SCRAPE_TIMEOUT_MS`, `SCRAPE_ATTEMPTS`, `BACKOFF_MS`.

Frontend: `VITE_API_URL`.

## Scheduling
Configure cron-job.org to call:
`POST https://YOUR-RENDER-SERVICE/api/scrape/run`
with an interval of 2 hours.

## Reliability approach
- Three scrape attempts by default.
- Exponential backoff between attempts.
- HTTP/HTML parsing is attempted first.
- Playwright is used when HTTP parsing cannot validate both price and stock.
- A scrape is only stored as successful/retried after price and stock have been validated.
- Failed runs are still inserted into `scrape_history` with empty price/stock and an error message.
- No old successful value is silently copied into a failed run.

## Before submission
1. Inspect the actual INE store and replace/adapt the generic extraction heuristics with selectors/API calls verified against it.
2. Test slow responses and failures repeatedly.
3. Track at least 2–3 products/options.
4. Let cron generate real unattended history.
5. Deploy frontend to Vercel and backend to Render.
6. Record the headed run showing a retry/failure.
7. Complete the design note describing AI use and corrections.

INE Product Price Tracker

A full-stack product price and stock tracking application built for the INE Software Engineer Intern Assignment.

The application allows users to search INE's mock storefront, select a specific product option, track its price and stock over time, inspect scrape history and failures, and export the complete scrape history as CSV.

The system is designed around reliable unattended scraping: requests are retried, slow/failing responses are handled explicitly, invalid results are not stored as successful scrapes, and every scrape attempt is recorded.

Features

Product Search & Tracking

Search the INE mock storefront by partial or full product name.

Select a product to track.

Store the selected product option/variant along with the product URL and ID.

View all currently tracked products from the dashboard.

Scheduled Price & Stock Monitoring

Scrapes every tracked product on a fixed 2-hour schedule.

Uses lightweight HTTP/HTML parsing first.

Falls back to Playwright when the required data cannot be reliably obtained from the initial HTML.

Applies configurable timeouts and retries.

Uses exponential backoff between failed attempts.

Validates price and stock before recording a successful result.

Price History

Stores every scrape result in PostgreSQL through Supabase.

Displays historical prices as a chart.

Displays stock state alongside historical scrape results.

Scrape Logging

Each scrape run records:

Timestamp

Product

Attempt number

Outcome

Price

Stock

Error message, when applicable

Scraping method used

Failures are retained in the history rather than being hidden.

CSV Export

The dashboard provides an Export CSV action containing the complete scrape history.

Export fields:

product_id
product_name
selected_option
timestamp
price
stock
outcome

Failed attempts are included with empty price and stock values.

Headed Scraper

A headed Playwright mode is provided for observing scraper behaviour during testing and for the required assignment demonstration.

Architecture

                    ┌──────────────────────┐
                    │      React / Vite    │
                    │        Vercel        │
                    └──────────┬───────────┘
                               │
                               │ REST API
                               ▼
                    ┌──────────────────────┐
                    │    Node.js / Express │
                    │        Render        │
                    └───────┬───────┬──────┘
                            │       │
                   Database │       │ Scraping
                            │       │
                            ▼       ▼
                    ┌───────────┐  ┌─────────────────┐
                    │ Supabase  │  │ INE Mock Store  │
                    │ PostgreSQL│  │                 │
                    └───────────┘  └─────────────────┘
                            ▲
                            │
                     Every 2 hours
                            │
                    ┌───────┴────────┐
                    │  cron-job.org  │
                    └────────────────┘

Scraping flow

Cron Trigger
     │
     ▼
POST /api/scrape/run
     │
     ▼
Load active tracked products
     │
     ▼
HTTP request
     │
     ├── Valid price + stock ───────► Store success
     │
     └── Missing/invalid/failed
                 │
                 ▼
             Retry with
           exponential backoff
                 │
                 ▼
          Playwright fallback
                 │
          ┌──────┴──────┐
          │             │
       Valid          Invalid
          │             │
          ▼             ▼
        Store         Store
       result        failed run

Technology Stack

Layer

Technology

Frontend

React.js + Vite

UI

CSS

Charts

Recharts

Backend

Node.js + Express

Database

Supabase PostgreSQL

HTTP Scraping

Native Fetch

HTML Parsing

Cheerio

Browser Automation

Playwright

Scheduling

cron-job.org

Frontend Hosting

Vercel

Backend Hosting

Render

Project Structure

ine-price-tracker/
│
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── scraper.js
│   │   ├── scrape-runner.js
│   │   ├── db.js
│   │   ├── config.js
│   │   └── headed.js
│   │
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   └── styles.css
│   │
│   ├── index.html
│   ├── package.json
│   └── .env.example
│
├── supabase/
│   └── schema.sql
│
├── README.md
├── DESIGN.md
└── .gitignore

Local Development

Prerequisites

Install:

Node.js 18+

npm

A Supabase project

Git

For headed/browser-based scraping:

Playwright Chromium

1. Clone the repository

git clone <YOUR_GITHUB_REPOSITORY_URL>
cd ine-price-tracker

2. Configure Supabase

Create a Supabase project and open:

SQL Editor

Run:

supabase/schema.sql

The database contains two primary tables:

tracked_products

Stores products currently being monitored.

Important fields:

id
product_id
product_name
product_url
selected_option
active
created_at

scrape_history

Stores every scrape attempt.

Important fields:

id
tracked_product_id
timestamp
price
stock
outcome
attempt_number
error_message
method

3. Configure the backend

cd backend
npm install

Create a .env file:

PORT=4000

STORE_BASE_URL=https://demo.inelabteamdev.com

SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

SCRAPE_TIMEOUT_MS=15000
SCRAPE_ATTEMPTS=3
BACKOFF_MS=1000

Start the development server:

npm run dev

The API will be available at:

http://localhost:4000

Health check:

GET /health

4. Configure the frontend

Open a second terminal:

cd frontend
npm install

Create .env:

VITE_API_URL=http://localhost:4000

Start the frontend:

npm run dev

The dashboard will be available at the Vite development URL shown in the terminal.

API Reference

Health

GET /health

Returns:

{
  "ok": true
}

Search Products

GET /api/products/search?q=<query>

Example:

/api/products/search?q=laptop

Returns matching products from the INE storefront.

List Tracked Products

GET /api/tracked-products

Track a Product

POST /api/tracked-products
Content-Type: application/json

Example:

{
  "product_id": "123",
  "product_name": "Example Product",
  "product_url": "https://demo.inelabteamdev.com/...",
  "selected_option": "256 GB"
}

Price History

GET /api/tracked-products/:id/history

Returns the stored historical scrape data for a tracked product.

Scrape Logs

GET /api/tracked-products/:id/logs

Returns every recorded scrape attempt for the selected product.

Run Scrape

POST /api/scrape/run

This endpoint is intended to be called by the external scheduler.

It processes all active tracked products.

Export History

GET /api/export

Returns the complete scrape history as a CSV download.

Scraping Reliability

Reliable unattended scraping is the central design goal of this project.

Retry Strategy

A scrape is attempted up to three times by default.

Attempt 1
   │
   ├── Success ───────────────► Store result
   │
   └── Failure
          │
          ▼
       Wait 1s
          │
          ▼
       Attempt 2
          │
          └── Failure
                 │
                 ▼
              Wait 2s
                 │
                 ▼
              Attempt 3

The retry count and backoff interval are configurable through environment variables.

Timeout Handling

Requests are protected by a configurable timeout.

A timeout is treated as a scrape failure and enters the retry flow instead of causing the scheduled run to terminate silently.

Data Validation

A scrape is only considered successful when both required values are available:

price != null
stock != null

If either value cannot be reliably extracted, the result is not stored as a successful scrape.

HTTP First, Browser When Necessary

The scraper first attempts lightweight HTTP retrieval and HTML parsing.

If the required information cannot be validated from the returned HTML, Playwright is used to render the page and retrieve dynamically loaded content.

This keeps normal scrape runs lightweight while still supporting pages where client-side rendering is required.

Honest Failure Recording

Failed scrapes are stored with:

price = NULL
stock = NULL
outcome = failed

The previous successful price is never copied into a failed scrape record.

This preserves an accurate historical record of what actually happened during each scheduled run.

Scheduling

The backend should not rely on an in-process setInterval() loop because the deployed backend may sleep on a free-tier hosting environment.

Instead, use an external scheduler such as cron-job.org.

Configure:

Method: POST

URL:
https://YOUR-RENDER-SERVICE.onrender.com/api/scrape/run

Frequency:
Every 2 hours

The resulting flow is:

cron-job.org
     │
     │ every 2 hours
     ▼
Render API
     │
     ▼
Scrape all active products
     │
     ▼
Supabase

Headed Scraper

The headed scraper is used to visually demonstrate browser-based scraping and retry behaviour.

Install Playwright's browser:

cd backend
npx playwright install chromium

Run:

npm run scrape:headed

For the final demonstration, show:

Browser opening the INE mock store.

Navigation to a tracked product.

Price and stock extraction.

A slow or failed attempt.

Retry behaviour.

Successful recovery or an honestly recorded failure.

The resulting scrape log.

Deployment

Backend — Render

Create a Web Service on Render.

Recommended configuration:

Root Directory: backend

Build Command:
npm install

Start Command:
npm start

Add the backend environment variables:

PORT=4000
STORE_BASE_URL=https://demo.inelabteamdev.com
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SCRAPE_TIMEOUT_MS=15000
SCRAPE_ATTEMPTS=3
BACKOFF_MS=1000

Frontend — Vercel

Import the repository into Vercel.

Set:

VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com

Build settings can use the frontend directory as the project root.

Database — Supabase

The production database is hosted on Supabase PostgreSQL.

Run:

supabase/schema.sql

before starting production scraping.

Production Checklist

Before submission, verify all of the following:

Frontend is deployed on Vercel.

Backend is deployed on Render.

Supabase database is configured.

GET /health works on the deployed backend.

Product search works against the INE mock store.

Product options are stored correctly.

At least 2–3 products are actively tracked.

Price and stock history contains real scheduled runs.

Failed scrape attempts appear in the logs.

Retry behaviour has been tested.

CSV export contains failed attempts as required.

cron-job.org triggers the scrape endpoint every 2 hours.

Headed scraper works.

Screen recording demonstrates a slow/failing response and recovery.

README and design note are complete.

Resume PDF is ready.

GitHub repository is public and contains all required source files.

No secrets or .env files are committed.

Environment Variables

Backend

Variable

Description

Example

PORT

Express server port

4000

STORE_BASE_URL

INE mock storefront

https://demo.inelabteamdev.com

SUPABASE_URL

Supabase project URL

https://....supabase.co

SUPABASE_SERVICE_ROLE_KEY

Server-side Supabase key

********

SCRAPE_TIMEOUT_MS

Scrape timeout

15000

SCRAPE_ATTEMPTS

Maximum attempts

3

BACKOFF_MS

Initial retry delay

1000

Frontend

Variable

Description

VITE_API_URL

Public backend API URL

Never commit Supabase service-role keys or other secrets to GitHub.

Design Decisions

Why Supabase?

Supabase provides a managed PostgreSQL database with a straightforward API, making it suitable for storing tracked products and time-series scrape records without requiring additional database infrastructure.

Why Express?

The application has a small REST API surface and Express keeps the backend simple and easy to deploy on Render.

Why Cheerio?

Most scrape attempts do not need a full browser. Parsing server-returned HTML with Cheerio reduces browser startup overhead.

Why Playwright?

The storefront may contain dynamically rendered content. Playwright provides a reliable fallback when the required price or stock information is not available in the initial HTML.

Why an external cron service?

A free-tier web server can sleep when inactive. An external scheduler can invoke the scrape endpoint independently, allowing scheduled runs without relying on a permanently running Node process.

Why store failures?

A price tracker should distinguish between:

"No scrape occurred"

and:

"A scrape was attempted and failed"

Persisting failures makes the monitoring history auditable and prevents missing data from being mistaken for a successful unchanged price.

AI-Assisted Development

AI tools were used during development for:

Initial project scaffolding.

Exploring implementation approaches.

Generating and reviewing boilerplate code.

Debugging and refactoring suggestions.

Documentation drafting.

All generated code was reviewed, tested, and adapted as part of the implementation. The final design and implementation decisions were validated against the assignment requirements.

Specific AI mistakes, corrections, and changes made during development are documented separately in DESIGN.md.

Assignment Scope

This project is intended solely for the INE-provided mock storefront:

https://demo.inelabteamdev.com

It is not intended to scrape real retailers or third-party websites.

Future Improvements

Potential extensions include:

Price-drop notifications.

Back-in-stock alerts.

Email notifications.

Storefront structure-change detection.

Configurable scrape frequency per product.

Tracking multiple options for a single product.

CI/CD using GitHub Actions.

More detailed product metadata.

Authentication and multi-user tracking.

Author

Yash Kapur

B.Tech Computer Science & Engineering
Guru Gobind Singh Indraprastha University, Delhi

License

This project was developed as an internship assignment for INE. The scraper is restricted to the provided INE mock storefront and is not intended for use against third-party retail websites.

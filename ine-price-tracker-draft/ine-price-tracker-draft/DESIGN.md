# Design Note — Draft

## Goal
Track a selected product option's price and stock from the INE mock store every two hours, while preserving an honest history of both successful and failed scrape attempts.

## Scraping strategy
The first pass uses lightweight HTTP fetching and HTML parsing. This minimizes browser overhead and is appropriate when the required values exist in server-rendered HTML. If price/stock are not available or valid in the fetched HTML, the scraper falls back to Playwright and waits briefly for asynchronous content.

## Reliability
Each scrape gets up to three attempts with exponential backoff. Validation is performed before writing a successful result. If all attempts fail, a `failed` history row is written with `price` and `stock` left empty and an error message. This prevents stale or guessed values from appearing as current data.

## Scheduling trade-off
The backend does not run an in-process two-hour timer. The assignment notes that free-tier backends can sleep, so an external cron service should trigger `/api/scrape/run` every two hours.

## AI disclosure — fill this in before submission
AI assistance was used to help structure the initial project, suggest API boundaries, retry/error-handling patterns, database schema, and frontend scaffolding. The generated code was reviewed and adapted against the actual INE mock store. Initial assumptions that did not match the real store should be documented here, together with the exact corrections made after testing.

## Known draft limitation
The live mock store could not be inspected from the environment used to generate this draft. Consequently, product search and extraction currently use generic heuristics. These must be verified and tightened against the actual store before the repository is submitted.

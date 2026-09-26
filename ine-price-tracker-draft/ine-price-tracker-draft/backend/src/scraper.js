import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import { config } from './config.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

function normalize(text = '') {
  return text.replace(/\\s+/g, ' ').trim();
}

function parsePrice(text) {
  const match = normalize(text).match(/(?:₹|INR|Rs\\.?)[\\s]*([0-9][0-9,]*(?:\\.[0-9]{1,2})?)/i);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
}

function extractWithCheerio(html, selectedOption) {
  const $ = cheerio.load(html);
  const bodyText = normalize($('body').text());

  const priceCandidates = [];
  $('[class*="price" i], [id*="price" i], [data-testid*="price" i]').each((_, el) => {
    const p = parsePrice($(el).text());
    if (p !== null) priceCandidates.push(p);
  });
  if (!priceCandidates.length) {
    const p = parsePrice(bodyText);
    if (p !== null) priceCandidates.push(p);
  }

  const stockMatch = bodyText.match(/(in stock|out of stock|available|unavailable|sold out)/i);
  const stock = stockMatch ? stockMatch[1] : null;

  return { price: priceCandidates[0] ?? null, stock, selectedOption };
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'INE-Price-Tracker/1.0' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function scrapeOnce(url, selectedOption, forceBrowser = false) {
  if (!forceBrowser) {
    const html = await fetchHtml(url);
    const result = extractWithCheerio(html, selectedOption);
    if (result.price !== null && result.stock !== null) return { ...result, method: 'http' };
  }

  const browser = await chromium.launch({ headless: !forceBrowser });
  try {
    const page = await browser.newPage({ userAgent: 'INE-Price-Tracker/1.0' });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.timeoutMs });
    await page.waitForLoadState('networkidle', { timeout: Math.min(config.timeoutMs, 8000) }).catch(() => {});
    await page.waitForTimeout(750);

    const text = normalize(await page.locator('body').innerText());
    const price = parsePrice(text);
    const stockMatch = text.match(/(in stock|out of stock|available|unavailable|sold out)/i);
    const stock = stockMatch ? stockMatch[1] : null;

    if (price === null || stock === null) {
      throw new Error(`Could not validate price/stock (price=${price}, stock=${stock})`);
    }
    return { price, stock, selectedOption, method: 'playwright' };
  } finally {
    await browser.close();
  }
}

export async function scrapeProduct(product, { headed = false } = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= config.attempts; attempt++) {
    try {
      const data = await scrapeOnce(product.product_url, product.selected_option, headed);
      return { ok: true, attempt, ...data };
    } catch (error) {
      lastError = error;
      if (attempt < config.attempts) await sleep(config.backoffMs * 2 ** (attempt - 1));
    }
  }
  return { ok: false, attempt: config.attempts, error: lastError?.message || 'Unknown scrape error' };
}

export async function searchStore(query) {
  const html = await fetchHtml(config.storeBaseUrl);
  const $ = cheerio.load(html);
  const q = query.toLowerCase();
  const results = [];
  $('a[href]').each((_, el) => {
    const name = normalize($(el).text());
    const href = $(el).attr('href');
    if (!name || !href || !name.toLowerCase().includes(q)) return;
    const url = new URL(href, config.storeBaseUrl).href;
    if (!results.some(x => x.url === url)) {
      results.push({ product_id: url.split('/').filter(Boolean).pop(), name, url });
    }
  });
  return results.slice(0, 20);
}

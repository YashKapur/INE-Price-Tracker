import express from 'express';
import cors from 'cors';
import { supabase } from './db.js';
import { searchStore } from './scraper.js';
import { runScrape } from './scrape-runner.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_, res) => res.json({ ok: true }));

app.get('/api/products/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json([]);
    res.json(await searchStore(q));
  } catch (e) { res.status(502).json({ error: e.message }); }
});

app.get('/api/tracked-products', async (_, res) => {
  const { data, error } = await supabase.from('tracked_products').select('*').eq('active', true).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/tracked-products', async (req, res) => {
  const { product_id, product_name, product_url, selected_option } = req.body;
  if (!product_id || !product_name || !product_url || !selected_option) return res.status(400).json({ error: 'All product fields are required.' });
  const { data, error } = await supabase.from('tracked_products').insert({ product_id, product_name, product_url, selected_option }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

app.get('/api/tracked-products/:id/history', async (req, res) => {
  const { data, error } = await supabase.from('scrape_history').select('*').eq('tracked_product_id', req.params.id).order('timestamp', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/tracked-products/:id/logs', async (req, res) => {
  const { data, error } = await supabase.from('scrape_history').select('*').eq('tracked_product_id', req.params.id).order('timestamp', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/export', async (_, res) => {
  const { data, error } = await supabase.from('scrape_history').select('tracked_product_id,timestamp,price,stock,outcome,attempt_number,error_message,tracked_products(product_id,product_name,selected_option)').order('timestamp', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  const header = ['product_id','product_name','selected_option','timestamp','price','stock','outcome'];
  const esc = v => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const rows = data.map(r => [r.tracked_products?.product_id,r.tracked_products?.product_name,r.tracked_products?.selected_option,r.timestamp,r.price,r.stock,r.outcome].map(esc).join(','));
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="scrape-history.csv"');
  res.send([header.join(','), ...rows].join('\n'));
});

app.post('/api/scrape/run', async (req, res) => {
  try { res.json({ ok: true, results: await runScrape(req.body?.product_id || null) }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.listen(process.env.PORT || 4000, () => console.log(`API listening on port ${process.env.PORT || 4000}`));

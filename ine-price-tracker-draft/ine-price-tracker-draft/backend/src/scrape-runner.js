import { supabase } from './db.js';
import { scrapeProduct } from './scraper.js';

export async function runScrape(productId = null) {
  let query = supabase.from('tracked_products').select('*').eq('active', true);
  if (productId) query = query.eq('id', productId);
  const { data: products, error } = await query;
  if (error) throw error;

  const results = [];
  for (const product of products || []) {
    const startedAt = new Date().toISOString();
    const result = await scrapeProduct(product);
    const row = {
      tracked_product_id: product.id,
      timestamp: startedAt,
      price: result.ok ? result.price : null,
      stock: result.ok ? result.stock : null,
      outcome: result.ok ? (result.attempt > 1 ? 'retried' : 'success') : 'failed',
      attempt_number: result.attempt,
      error_message: result.ok ? null : result.error,
      method: result.method || null
    };
    const insert = await supabase.from('scrape_history').insert(row).select().single();
    if (insert.error) throw insert.error;
    results.push({ product: product.product_name, ...row });
  }
  return results;
}

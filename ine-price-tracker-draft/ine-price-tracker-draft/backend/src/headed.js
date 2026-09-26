import { supabase } from './db.js';
import { scrapeProduct } from './scraper.js';

const { data, error } = await supabase.from('tracked_products').select('*').eq('active', true).limit(1);
if (error) throw error;
if (!data?.length) throw new Error('Track at least one product before running headed mode.');

console.log('Starting headed scrape for:', data[0].product_name, data[0].selected_option);
const result = await scrapeProduct(data[0], { headed: true });
console.log(JSON.stringify(result, null, 2));

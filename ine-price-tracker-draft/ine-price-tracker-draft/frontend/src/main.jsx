import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './styles.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const api = async (path, options) => { const r = await fetch(`${API}${path}`, options); if (!r.ok) throw new Error((await r.json()).error || 'Request failed'); return r.headers.get('content-type')?.includes('text/csv') ? r.blob() : r.json(); };

function App() {
  const [q,setQ]=useState(''); const [results,setResults]=useState([]); const [tracked,setTracked]=useState([]); const [selected,setSelected]=useState(null); const [option,setOption]=useState('Default'); const [history,setHistory]=useState([]); const [logs,setLogs]=useState([]); const [loading,setLoading]=useState(false); const [message,setMessage]=useState('');
  const loadTracked=()=>api('/api/tracked-products').then(setTracked).catch(e=>setMessage(e.message));
  useEffect(()=>{loadTracked()},[]);
  const search=async()=>{setLoading(true);try{setResults(await api(`/api/products/search?q=${encodeURIComponent(q)}`))}catch(e){setMessage(e.message)}finally{setLoading(false)}};
  const track=async()=>{try{await api('/api/tracked-products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product_id:selected.product_id,product_name:selected.name,product_url:selected.url,selected_option:option})});setSelected(null);await loadTracked();setMessage('Product tracked.')}catch(e){setMessage(e.message)}};
  const inspect=async(p)=>{try{const [h,l]=await Promise.all([api(`/api/tracked-products/${p.id}/history`),api(`/api/tracked-products/${p.id}/logs`)]);setHistory(h);setLogs(l)}catch(e){setMessage(e.message)}};
  const exportCsv=async()=>{const blob=await api('/api/export');const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='scrape-history.csv';a.click();URL.revokeObjectURL(a.href)};
  return <main><header><div><h1>INE Price Tracker</h1><p>Reliable product price & stock monitoring</p></div><button onClick={exportCsv}>Export CSV</button></header>
    <section className="card"><h2>Search the INE store</h2><div className="search"><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()} placeholder="e.g. phone, laptop..."/><button onClick={search}>{loading?'Searching...':'Search'}</button></div>
    {results.map(r=><div className="result" key={r.url}><div><b>{r.name}</b><small>{r.url}</small></div><button onClick={()=>{setSelected(r);setOption('Default')}}>Track</button></div>)}</section>
    {selected&&<section className="card"><h2>Track product</h2><p><b>{selected.name}</b></p><input value={option} onChange={e=>setOption(e.target.value)} placeholder="Selected option (e.g. 256 GB)"/><button onClick={track}>Confirm tracking</button></section>}
    <section><h2>Tracked products</h2><div className="grid">{tracked.map(p=><article className="product" key={p.id}><h3>{p.product_name}</h3><p>{p.selected_option}</p><button onClick={()=>inspect(p)}>View history</button></article>)}</div></section>
    {history.length>0&&<section className="card"><h2>Price history</h2><div className="chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={history.filter(x=>x.price!==null)}><XAxis dataKey="timestamp" tickFormatter={v=>new Date(v).toLocaleDateString()}/><YAxis/><Tooltip/><Line type="monotone" dataKey="price" strokeWidth={2}/></LineChart></ResponsiveContainer></div>
    <h2>Scrape log</h2><div className="table"><div className="row head"><span>Timestamp</span><span>Outcome</span><span>Price</span><span>Stock</span></div>{logs.map(l=><div className="row" key={l.id}><span>{new Date(l.timestamp).toLocaleString()}</span><span>{l.outcome}</span><span>{l.price??'—'}</span><span>{l.stock??'—'}</span></div>)}</div></section>}
    {message&&<div className="toast">{message}</div>}
  </main>
}
createRoot(document.getElementById('root')).render(<App/>);

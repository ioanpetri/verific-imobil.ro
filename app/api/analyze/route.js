import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
const allowed = ['imobiliare.ro','storia.ro','olx.ro','homezz.ro','romimo.ro','publi24.ro','remax.ro','blitz.ro','napocaimobiliare.ro'];
const weights = {thermal:15,acoustic:12,visual:12,structural:18,materials:10,layout:15,liveability:10,neighbourhood:8};
const keys = Object.keys(weights);
const json = (data, status=200) => NextResponse.json(data,{status});

function validateUrl(input) {
  if (!input) return null;
  try {
    const u = new URL(input);
    if (u.protocol !== 'https:' || u.username || u.password || u.port) return null;
    const host = u.hostname.toLowerCase();
    if (!allowed.some(d => host === d || host.endsWith('.'+d))) return null;
    return u.toString();
  } catch { return null; }
}
function htmlToText(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&')
    .replace(/\s+/g,' ').trim().slice(0,16000);
}
async function fetchListing(url) {
  try {
    const res = await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(8500),headers:{'User-Agent':'Mozilla/5.0 (compatible; VerificImobil/2.1)','Accept':'text/html'}});
    if (!res.ok || !(res.headers.get('content-type')||'').includes('text/html')) return '';
    const len = Number(res.headers.get('content-length')||0);
    if (len > 1500000) return '';
    const raw = await res.text();
    return htmlToText(raw.slice(0,1500000));
  } catch { return ''; }
}
function normalizeCriteria(obj) {
  const out = {};
  for (const key of keys) {
    const v = obj?.[key] || {};
    const n = Number(v.score);
    out[key] = {
      score: v.score == null || !Number.isFinite(n) ? null : Math.max(0,Math.min(10,n)),
      reason: String(v.reason || 'Informatii insuficiente.'),
      evidence: ['declared','inferred','unknown'].includes(v.evidence) ? v.evidence : 'unknown'
    };
  }
  return out;
}
function array(value) { return Array.isArray(value) ? value.filter(x=>typeof x==='string').slice(0,12) : []; }

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return json({error:'Cerere JSON invalida.'},400); }
  const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
  const url = validateUrl(rawUrl);
  if (rawUrl && !url) return json({error:'URL invalid sau domeniu neacceptat. Foloseste HTTPS si un portal suportat.'},400);
  const description = typeof body.description === 'string' ? body.description.trim().slice(0,20000) : '';
  if (!url && description.length < 30) return json({error:'Introdu o descriere de cel putin 30 de caractere sau un URL acceptat.'},422);
  if (!process.env.OPENAI_API_KEY) return json({error:'OPENAI_API_KEY nu este configurata pe server.'},503);
  const extracted = url ? await fetchListing(url) : '';
  if (extracted.length < 100 && description.length < 30) return json({error:'Nu am putut extrage anuntul. Adauga manual o descriere de minimum 30 de caractere.'},422);
  const source = [url ? `Link: ${url}` : '', extracted.length>=100 ? `Text extras: ${extracted}` : '',description ? `Descriere introdusa: ${description}` : ''].filter(Boolean).join('\n\n');
  const system = `Esti analist imobiliar prudent. Raspunde EXCLUSIV cu un obiect JSON valid, in romana. Evalueaza doar dovezile disponibile; nu inventa date despre structura, siguranta, izolatie, randament, acte sau preturi de piata. Marcheaza necunoscut cu score:null si evidence:"unknown". Distingi "declared" (afirmat in anunt), "inferred" (inferenta prudenta) si "unknown". Nu presupune ca decomandat, semidecomandat, nedecomandat sau circular au o ierarhie universala. Scorurile sunt intre 0 si 10. Schema: {"summary":"string","criteria":{"thermal":{"score":null,"reason":"string","evidence":"unknown"},"acoustic":{},"visual":{},"structural":{},"materials":{},"layout":{},"liveability":{},"neighbourhood":{}},"investment":{"score":null,"reason":"string"},"confidence":"string","layout":"string","warnings":["string"],"missing":["string"],"questions":["string"],"checklist":["string"]}. Completeaza fiecare criteriu cu score, reason si evidence.`;
  let upstream;
  try {
    upstream = await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.OPENAI_API_KEY}`},
      body:JSON.stringify({model:'gpt-4o-mini',temperature:0.2,response_format:{type:'json_object'},messages:[{role:'system',content:system},{role:'user',content:source}] }),signal:AbortSignal.timeout(45000)
    });
  } catch { return json({error:'Conexiunea la OpenAI a esuat sau a expirat.'},502); }
  if (!upstream.ok) {
    const e = await upstream.json().catch(()=>({}));
    const code = e?.error?.code || e?.error?.type || 'unknown';
    console.error('OpenAI error',upstream.status,code);
    let message = `OpenAI HTTP ${upstream.status}. Verifica configurarea API.`;
    if (code === 'credit_balance_exhausted' || code === 'insufficient_quota') message = 'Creditul OpenAI API este epuizat. Verifica Usage si Billing.';
    else if (upstream.status===401) message='Cheia OpenAI API este invalida sau nu are acces.';
    else if (upstream.status===429) message='Limita de utilizare OpenAI API a fost atinsa. Verifica Usage si Billing.';
    return json({error:message,openaiStatus:upstream.status,openaiCode:code},502);
  }
  let parsed;
  try {
    const payload = await upstream.json();
    parsed = JSON.parse(payload.choices?.[0]?.message?.content || '{}');
  } catch { return json({error:'Raspuns AI invalid. Incearca din nou.'},502); }
  const criteria = normalizeCriteria(parsed.criteria);
  const coverage = keys.reduce((s,k)=>s+(criteria[k].score==null?0:weights[k]),0);
  const weighted = keys.reduce((s,k)=>s+(criteria[k].score==null?0:criteria[k].score*weights[k]),0);
  const quality = coverage>=60 ? Math.round((weighted/coverage)*10)/10 : null;
  const inv = Number(parsed.investment?.score);
  const investment = {score:parsed.investment?.score == null || !Number.isFinite(inv) ? null : Math.max(0,Math.min(10,inv)),reason:String(parsed.investment?.reason||'Informatii insuficiente.')};
  return json({summary:String(parsed.summary||''),criteria,quality,coverage,investment,confidence:String(parsed.confidence||''),layout:String(parsed.layout||''),warnings:array(parsed.warnings),missing:array(parsed.missing),questions:array(parsed.questions),checklist:array(parsed.checklist)});
}

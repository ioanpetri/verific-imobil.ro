import { NextResponse } from 'next/server';
import { calibrateCriteria, guardMarketScores } from '../../lib/hybrid-engine';
import marketData from '../../data/market-cluj.json';
import {marketPosition, marketPrompt} from '../../lib/market-calibration';
import {applyEvidenceRubric, scoreReliability, investmentScenario} from '../../lib/scoring-v33';

export const runtime = 'nodejs';
const allowed = ['imobiliare.ro','storia.ro','olx.ro','homezz.ro','romimo.ro','publi24.ro','remax.ro','blitz.ro','napocaimobiliare.ro'];
const weights = {thermal:12,acoustic:10,visual:10,structural:15,materials:10,layout:15,liveability:10,neighbourhood:18};
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
const subcriteria = {
 structural:[['era','Anul și perioada construcției',20],['structure','Tipul structurii',25],['documents','Documentație tehnică',35],['condition','Stare și intervenții',20]],
 layout:[['area','Suprafață și camere',40],['distribution','Compartimentare',30],['bathrooms','Numărul băilor',15],['kitchen','Bucătărie și depozitare',15]],
 thermal:[['insulation','Izolație',25],['windows','Ferestre',20],['heating','Încălzire',25],['energy','Eficiență energetică',20],['ventilation','Ventilație',10]],
 acoustic:[['between','Izolare între apartamente',35],['outside','Zgomot exterior',30],['position','Poziția în clădire',20],['windows','Protecție fonică ferestre',15]],
 visual:[['orientation','Orientare',30],['windows','Suprafață vitrată',25],['obstructions','Etaj și obstacole',25],['view','Vedere și intimitate',20]],
 materials:[['quality','Calitatea materialelor',35],['workmanship','Calitatea execuției',30],['design','Aspect și design',25],['condition','Starea actuală',10]],
 liveability:[['ergonomics','Ergonomie',30],['privacy','Intimitate',25],['terrace','Balcon sau terasă',20],['storage','Depozitare și dotări',15],['access','Acces și facilități',10]],
 neighbourhood:[['base','Reper cartier',0],['quiet','Liniște și trafic',0],['transport','Transport și servicii',0],['walking','Acces pietonal',0],['parking','Parcare și acces',0]]
};
const neighbourhoodBases = [
 [['centru','ultracentru','gheorgheni','andrei muresanu'],9],
 [['grigorescu','zorilor','marasti','plopilor'],8],
 [['manastur','buna ziua','borhanci','sopor'],6],
 [['iris','someseni','bulgaria'],4],
 [['floresti','baciu','apahida'],2]
];
function plain(text){return String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ')}
function areaBase(text){const t=plain(text);for(const [names,base] of neighbourhoodBases){if(names.some(name=>new RegExp('(^|\\s)'+name+'($|\\s)').test(t)))return base;}return null;}
const clampScore = n=>Math.max(1,Math.min(10,Math.round(n*10)/10));
// Explicatii deterministe per criteriu: nu transforma ipotezele in fapte.
const analysisGuides = {
 structural:{indicator:'anul constructiei, sistemul structural, interventiile si documentatia tehnica',verify:'Solicita cartea tehnica, autorizatia si, daca exista indicii de degradare, evaluarea unui inginer structurist.'},
 layout:{indicator:'suprafata utila, numarul si dimensiunile camerelor, circulatiile, baile si depozitarea',verify:'Compara releveul cadastral cu compartimentarea reala si masoara spatiile utile la vizionare.'},
 thermal:{indicator:'izolatia anvelopei, ferestrele, incalzirea, ventilatia si consumul energetic',verify:'Solicita certificatul energetic si facturi sezoniere; inspecteaza puntile termice si eventualele urme de condens.'},
 acoustic:{indicator:'expunerea la trafic, pozitia in cladire, peretii comuni si izolarea ferestrelor',verify:'Viziteaza locuinta la ore de varf si seara; testeaza zgomotul cu ferestrele inchise si deschise.'},
 visual:{indicator:'orientarea, dimensiunea ferestrelor, etajul, obstacolele si intimitatea',verify:'Verifica orientarea si lumina naturala la ore diferite, inclusiv eventualele constructii care obtureaza vederea.'},
 materials:{indicator:'tipul finisajelor, calitatea montajului, durabilitatea si uzura vizibila',verify:'Inspecteaza imbinarile, pardoselile, instalatiile si eventualele defecte ascunse sub finisaje.'},
 liveability:{indicator:'ergonomia, intimitatea, balconul, spatiile de depozitare si accesibilitatea',verify:'Testeaza circulatia, mobilarea reala, accesul si utilizarea zilnica a spatiilor la vizionare.'},
 neighbourhood:{indicator:'localizarea exacta, transportul, serviciile, traficul, parcarea si microzona',verify:'Confirma adresa, timpii reali de deplasare si situatia parcarii prin vizite la ore diferite si surse locale.'}
};
const weakText = v => !v || String(v).trim().length<45 || /^(date limitate|verifica informatiile relevante|confirmă datele relevante|date insuficiente)/i.test(String(v).trim());
function enrichAnalysis(key,v,sub,source){
 const g=analysisGuides[key];
 const detail=subcriteria[key].filter(([id])=>id!=='base').map(([id,name])=>`${name.toLowerCase()}: ${sub[id].score}/10`).join('; ');
 const limited='Notele subcriteriilor sunt estimari orientative, nu masuratori sau verificari documentare.';
 const basis=weakText(v.basis)?`Indicatori evaluati: ${detail}. ${limited} Repere de piata: Indicele Imobiliare.ro descrie preturi cerute la nivel de oras, nu confirma aceste caracteristici ale locuintei.`:String(v.basis);
 const toVerify=weakText(v.toVerify)?`Interpretarea scorului se bazeaza pe ${g.indicator}; fara dovezi directe, concluzia ramane provizorie. ${g.verify}`:String(v.toVerify);
 return {basis,toVerify};
}
function normalizeCriteria(obj,source) {
  const out = {};
  const base = areaBase(source);
  for (const key of keys) {
    const v = obj?.[key] || {};
    const incoming = v.subcriteria && typeof v.subcriteria==='object' ? v.subcriteria : {};
    const sub = {};
    for(const [id,name] of subcriteria[key]){
      const raw = incoming[id];const n=Number(typeof raw==='object'&&raw!==null?raw.score:raw);
      sub[id]={name,score:raw==null||!Number.isFinite(n)?5:clampScore(n)};
    }
    let score;
    let adjustment=null;
    if(key==='neighbourhood' && base!==null){
      const n=Number(v.microzoneAdjustment);
      adjustment=Number.isFinite(n)&&v.microzoneAdjustment!=null?Math.max(-2,Math.min(2,Math.round(n*2)/2)):0;
      score=clampScore(base+adjustment);
      sub.base.score=base;
    }else if(key==='neighbourhood'){
      const n=Number(v.score);score=v.score==null||!Number.isFinite(n)?5:clampScore(n);
    }else{
      score=clampScore(subcriteria[key].reduce((sum,[id,,w])=>sum+sub[id].score*w,0)/100);
    }
    const enriched=enrichAnalysis(key,v,sub,source);
    out[key]={score,subcriteria:sub,microzoneAdjustment:adjustment,neighbourhoodBase:key==='neighbourhood'?base:null,
      reason:String(v.reason||'Scor orientativ; sunt necesare mai multe informații pentru o evaluare precisă.'),
      basis:enriched.basis,toVerify:enriched.toVerify,
      confidence:['high','moderate','low'].includes(v.confidence)?v.confidence:'low',
      evidence:['declared','inferred','estimated','documented','unknown'].includes(v.evidence)?v.evidence:'estimated'};
  }
  return out;
}
// Repere publicate de Indicele Imobiliare.ro pentru apartamente in Cluj-Napoca.
// Sunt preturi SOLICITATE medii, nu tranzactii si nu istoric al locuintei analizate.
const CLUJ_INDEX = [
  {label:'Iul 2026',period:'2026-07',value:3306,kind:'istoric'},
  {label:'Sep 2026',period:'2026-09',value:3316,kind:'istoric'}
];
function estimatePrice(source, facts) {
  const numeric = n => Number.isFinite(Number(n)) && Number(n)>0 ? Number(n) : null;
  // Extragem numai valori prezente explicit; modelul nu are voie sa inventeze suprafete.
  const areaMatch = source.match(/(?:suprafata(?:\s+utila)?|suprafața(?:\s+utilă)?|utili|utila|utilă)\s*[:=]?\s*(\d{2,3}(?:[.,]\d+)?)\s*(?:mp|m²)/i)
    || source.match(/\b(\d{2,3}(?:[.,]\d+)?)\s*(?:mp|m²)\s*(?:utili|utila|utilă)?\b/i);
  const extractedArea = areaMatch ? Number(areaMatch[1].replace(',','.')) : null;
  const area = extractedArea>=18 && extractedArea<=300 ? extractedArea : null;
  const supplied = numeric(facts?.areaSqm);
  const safeArea = area || (supplied>=18 && supplied<=300 && new RegExp(String(Math.round(supplied))).test(source) ? supplied : null);
  const typical = !safeArea;
  const sqm = safeArea || 55; // suprafata EXEMPLU, NU media publicata de indice si NU caracteristica proprietatii
  const newest = CLUJ_INDEX.at(-1).value;
  const baseline = sqm*newest;
  // Doua observatii publice permit o linie istorica scurta, NU un trend anual robust.
  // Scenariul central este constant; intervalele +/-4% pe an sunt ipoteze ilustrative.
  const history = CLUJ_INDEX.map(x=>({label:x.label,period:x.period,value:Math.round(sqm*x.value),kind:'istoric',eurSqm:x.value}));
  const horizons=[3,6,12];
  const forecast=horizons.map(months=>({
    label:`+${months} luni`,months,kind:'prognoza',
    value:Math.round(baseline),
    low:Math.round(baseline*Math.pow(0.96,months/12)),
    high:Math.round(baseline*Math.pow(1.04,months/12))
  }));
  const margin=typical?0.25:0.18;
  return {
    low:Math.round(baseline*(1-margin)),mid:Math.round(baseline),high:Math.round(baseline*(1+margin)),history,forecast,
    typical,areaSqm:sqm,forecastAnnual:0,forecastConfidence:'scazuta',marketEurSqm:newest,marketPeriod:'2026-09',
    basis:typical
      ? 'Reper de piata pentru un apartament exemplificativ de 55 mp in Cluj-Napoca; suprafata locuintei analizate nu a fost confirmata.'
      : `Estimare orientativa: ${sqm} mp × ${newest.toLocaleString('ro-RO')} €/mp (indicele Cluj-Napoca, septembrie 2026). Nu reprezinta pret de tranzactionare.`,
    sourceUrl:'https://www.imobiliare.ro/indicele-imobiliare-ro/cluj-napoca',
    method:'Indicele Imobiliare.ro, iulie si septembrie 2026. Doua observatii istorice; prognoza este un scenariu constant +/-4% anual, nu predictie statistica validata.'
  };
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
  const marketContext = marketPrompt();
  const system = `Ești analist imobiliar prudent pentru Cluj-Napoca și împrejurimi. Răspunde EXCLUSIV JSON valid în română. Evaluează fiecare dintre cele 8 criterii și fiecare subcriteriu cu o notă numerică de la 1 la 10. Dacă datele lipsesc, acordă 5/10 ca estimare neutră; nu inventa documente, expertize, caracteristici, prețuri comparabile sau măsurători. Scorurile 9 și 10 necesită indicii consistente. Pentru fiecare criteriu scrie în limba română un reason concis (1-2 fraze) care INTERPRETEAZĂ scorul prin logica imobiliară și indicatori de calitate specifici, nu doar repetă anunțul; basis prezintă 2-3 indicatori specifici criteriului, cu valori concrete numai dacă apar în anunț; distinge explicit faptele din anunț de inferențe și repere de piață (2-3 fraze). toVerify explică efectul asupra scorului, apoi 1-2 verificări practice și motivul lor (2-3 fraze). Dacă nu există informații directe, explică ce indicatori contează, ce nu se poate deduce și cum se verifică; nu utiliza formulări generice. Nu repeta aceeași formulare între câmpuri. Pentru structural: anul, structura, degradările, expertiza; nu confunda termosistemul ori feroneria cu siguranța structurală. Pentru layout: mp utili, dimensiunile camerelor, decomandare, băi, bucătărie. Pentru thermal: anvelopă, tâmplărie, încălzire, consum, ventilație. Pentru acoustic: zgomot stradal, transmisie între apartamente, poziție, măsurători. Pentru visual: orientare, suprafață vitrată, obstacole, priveliște; balustrada de sticlă nu dovedește luminozitatea. Pentru materials: material, calitatea execuției, durabilitate și uzură. Pentru liveability: ergonomie, intimitate, terasă, depozitare, acces. Pentru neighbourhood: reperul calibrat, microzona, mobilitate, servicii, zgomot și acces; nu inventa criminalitate ori densitate. Un aspect necunoscut afectează certitudinea, nu dovedește un defect. evidence poate fi documented, declared, inferred, estimated; confidence poate fi high, moderate, low. Aceste etichete nu trebuie să apară în explicații ca texte repetitive.
Scorurile criteriilor sunt calculate ulterior de server din subcriteriile pe care le furnizezi; nu calcula tu scorul general. Folosește EXACT aceste chei în subcriteria:
structural: era, structure, documents, condition;
layout: area, distribution, bathrooms, kitchen;
thermal: insulation, windows, heating, energy, ventilation;
acoustic: between, outside, position, windows;
visual: orientation, windows, obstructions, view;
materials: quality, workmanship, design, condition;
liveability: ergonomics, privacy, terrace, storage, access;
neighbourhood: base, quiet, transport, walking, parking.
Pentru neighbourhood, serverul aplică grila de cartiere: 5/5 reper 9 (Centru/Ultracentru, Gheorgheni, Andrei Mureșanu); 4/5 reper 8 (Grigorescu, Zorilor, Mărăști, Plopilor); 3/5 reper 6 (Mănăștur, Bună Ziua, Borhanci, Sopor); 2/5 reper 4 (Iris, Someșeni, Bulgaria); 1/5 reper 2 (Florești, Baciu, Apahida). Furnizează microzoneAdjustment între -2 și +2 în pași de 0,5, justificat STRICT prin informații despre microzonă, trafic, acces, zgomot și servicii. Dacă nu sunt indicii suficiente, folosește 0. Nu confunda calitatea clădirii cu amplasamentul. Serverul impune limita ±2 și intervalul 1–10. Pentru cartiere neidentificate, estimează prudent neighbourhood.score, fără să inventezi un reper.
Siguranța structurală nu poate fi confirmată numai din anul clădirii. Riscurile grave, dacă sunt cunoscute, trebuie explicate la criteriul corespunzător, nu ascunse. Pentru investiție ia în calcul echilibrul dintre randament net din chirie, apreciere, lichiditate și preț/riscuri; chiar dacă lipsesc date economice, investment.score TREBUIE să fie un număr între 1 și 10, cu estimare neutră 5/10 dacă nu există indicii suficiente. Folosește prețul, suprafața, cartierul și calitatea proprietății când sunt disponibile. Nu inventa chirii, randamente, tranzacții comparabile sau apreciere viitoare. Reguli calibrate pe trei evaluari umane: semidecomandarea limiteaza compartimentarea, parterul necesita verificarea luminii si intimitatii, iar apropierea garii poate creste riscul acustic fara a dovedi zgomot. Acestea sunt ipoteze de verificat, nu defecte certe. Explică limpede ce este cunoscut și ce nu.
Pentru atractivitatea achizitiei furnizeaza acquisition.subscores cu priceValue, buyerDemand, compromises, resale (1-10 fiecare). Componentele sunt raport pret/calitate fata de comparabile verificate, cerere pentru segmentul de suprafata/buget, compromisuri si costuri, flexibilitate la revanzare. Fara comparabile verificabile, priceValue=5 neutru; nu afirma ca pretul este sub piata fara dovezi. Pentru investitie furnizeaza investment.subscores cu netYield, appreciation, liquidity, entryRisk (1-10 fiecare). Randamentul NET cere chirie estimata fundamentat, grad de ocupare, taxe, mentenanta si costuri; in absenta lor netYield=5. Aprecierea viitoare fara date verificabile =5. Lichiditatea poate tine cont prudent de suprafata, buget total, amplasament si etaj; nu penaliza automat suprafata peste 70mp. Prețul de intrare nu poate fi declarat avantajos fara comparabile. Explica lipsurile. Nu folosi N/A. Daca nu poti justifica o nota, foloseste 5 ca estimare neutra. Scorul general este calculat de server ca 70% locuire si 30% atractivitatea achizitiei. Nu confunda scorul de investitie cu scorul general. Pentru provenienta datelor, clasifica criteriul ca declared sau documented doar cand exista indicatori concreti in anunt, altfel inferred daca dedus explicit ori estimated daca neutru.
Schema obligatorie: {"summary":"string","criteria":{"structural":{"score":5,"subcriteria":{"era":5,"structure":5,"documents":5,"condition":5},"reason":"string","basis":"string","toVerify":"string","evidence":"estimated","confidence":"low"},"layout":{"subcriteria":{"area":5,"distribution":5,"bathrooms":5,"kitchen":5},"reason":"string"},"thermal":{"subcriteria":{"insulation":5,"windows":5,"heating":5,"energy":5,"ventilation":5}},"acoustic":{"subcriteria":{"between":5,"outside":5,"position":5,"windows":5}},"visual":{"subcriteria":{"orientation":5,"windows":5,"obstructions":5,"view":5}},"materials":{"subcriteria":{"quality":5,"workmanship":5,"design":5,"condition":5}},"liveability":{"subcriteria":{"ergonomics":5,"privacy":5,"terrace":5,"storage":5,"access":5}},"neighbourhood":{"score":5,"microzoneAdjustment":0,"subcriteria":{"base":5,"quiet":5,"transport":5,"walking":5,"parking":5}}},"acquisition":{"subscores":{"priceValue":5,"buyerDemand":5,"compromises":5,"resale":5},"reason":"string"},"investment":{"subscores":{"netYield":5,"appreciation":5,"liquidity":5,"entryRisk":5},"reason":"string"},"layout":"string"}. Completează reason, basis, toVerify, evidence și confidence pentru TOATE criteriile, după modelul structural. Scorurile sunt orientative, nu expertize certificate.`;
  let upstream;
  try {
    upstream = await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.OPENAI_API_KEY}`},
      body:JSON.stringify({model:'gpt-4o-mini',temperature:0.2,response_format:{type:'json_object'},messages:[{role:'system',content:system+'\n'+marketContext},{role:'user',content:source}] }),signal:AbortSignal.timeout(45000)
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
  const criteria = normalizeCriteria(parsed.criteria,source);
  const calibrationNotes = calibrateCriteria(criteria,source);
  const rubricChanges = applyEvidenceRubric(criteria,source);
  // Acoperirea este raportata numai cand exista provenienta pozitiva identificata.
  // Zero etichete pozitive nu dovedeste zero informatii in anunt.
  const coveredWeight = keys.reduce((s,k)=>s+(["documented","declared","inferred"].includes(criteria[k].evidence)?weights[k]:0),0);
  // Completitudinea este calculata numai din date explicit prezente in textul sursa,
  // nu din etichetele criteriilor generate de model.
  const explicitFields = [
    ['price',/(?:\bpret\b|\bpreț\b|\bprice\b|\b€\b|\bEUR\b|\beuro\b)/i],
    ['area',/\b\d{2,3}(?:[.,]\d+)?\s*(?:mp|m²|metri patrați)\b/i],
    ['rooms',/\b\d+\s*(?:camere|camera|dormitoare)\b/i],
    ['floor',/\b(?:etaj(?:ul)?|parter|mansardă|mansarda)\b/i],
    ['year',/\b(?:19|20)\d{2}\b/],
    ['neighbourhood',/\b(?:Gheorgheni|Mărăști|Marasti|Mănăștur|Manastur|Zorilor|Grigorescu|Centru|Bună Ziua|Buna Ziua|Borhanci|Florești|Floresti|Iris|Someșeni|Someseni|Plopilor|Sopor|Baciu|Apahida|Bulgaria|Andrei Mureșanu)\b/i],
    ['structure',/\b(?:beton armat|cadre|structur[ăa]|cărămidă|caramida|prefabricat)\b/i],
    ['insulation',/\b(?:izolat|izolație|izolatie|termoizolație|termoizolatie|polistiren|vată minerală)\b/i],
    ['heating',/\b(?:central[ăa]|încălzire|incalzire|calorifer|pardoseală|pardoseala)\b/i],
    ['windows',/\b(?:termopan|tripan|geamuri|ferestre|tâmplărie|tamplarie)\b/i],
    ['energy',/\b(?:certificat energetic|clas[ăa] energetic[ăa])\b/i],
    ['layout',/\b(?:decomandat|semidecomandat|nedecomandat|open.space|bucătărie|bucatarie)\b/i],
    ['orientation',/\b(?:orientare|nord|sud|est|vest|luminozitate)\b/i],
    ['balcony',/\b(?:balcon|teras[ăa]|logie)\b/i],
    ['parking',/\b(?:parcare|garaj|loc de parcare)\b/i],
    ['condition',/\b(?:renovat|finisaj|finisaje|stare bună|stare buna|infiltrații|infiltratii)\b/i]
  ];
  const available = explicitFields.filter(([,regex])=>regex.test(source)).length;
  const completeness = {percent:Math.round(available/explicitFields.length*100),available,total:explicitFields.length,derived:0};
  const coverage = coveredWeight > 0 ? coveredWeight : null;
  const weighted = keys.reduce((s,k)=>s+(criteria[k].score==null?0:criteria[k].score*weights[k]),0);
  const quality = Math.round((weighted/100)*10)/10;
  const normalizedPart = (raw, definitions) => {
    const subscores = {};
    for (const [key] of definitions) {
      const input = raw?.subscores?.[key];
      const n = Number(input);
      subscores[key] = input == null || !Number.isFinite(n) || n < 1 || n > 10 ? 5 : clampScore(n);
    }
    const score = clampScore(definitions.reduce((sum,[key,weight]) => sum + subscores[key]*weight,0)/100);
    return {score,subscores};
  };
  const acquisition = {
    ...normalizedPart(parsed.acquisition,[['priceValue',40],['buyerDemand',25],['compromises',20],['resale',15]]),
    reason:String(parsed.acquisition?.reason || 'Estimare orientativă; comparațiile de preț și cererea segmentului necesită verificare.')
  };
  const investment = {
    ...normalizedPart(parsed.investment,[['netYield',25],['appreciation',25],['liquidity',25],['entryRisk',25]]),
    reason:String(parsed.investment?.reason || 'Estimare orientativă. Fără date verificabile despre chiria netă, piață și costuri, componentele necunoscute sunt neutre (5/10).')
  };
  const marketNotes = guardMarketScores(acquisition,investment,source);
  const general = clampScore(quality*0.7 + acquisition.score*0.3);
  const priceEstimate = estimatePrice(source,parsed.propertyFacts);
  const marketCalibration = marketPosition(source);
  const reliability = scoreReliability(criteria,marketCalibration,rubricChanges);
  const rentalScenario = marketCalibration.askingPriceEur && marketCalibration.areaSqm ? investmentScenario({price:marketCalibration.askingPriceEur,area:marketCalibration.areaSqm,rentPerSqm:marketData.benchmarks.find(b=>b.source==='Castela'&&b.metric==='rent_asking_eur_sqm_month')?.value??NaN,occupancy:0.92}) : null;
  return json({engine:{version:'3.3.0',method:'AI pentru extragere + reguli deterministe auditate',calibrationCases:3,calibrationNotes,rubricChanges,marketNotes,marketData:'agregate numerice ANEVAR 2019-2020, Market360 2024, Castela si Imobiliare.ro 2026; fara comparabile individuale'},priceEstimate,marketCalibration,reliability,rentalScenario,marketEvidence:{benchmark:marketData.benchmarks,sourceRegistry:marketData.sources,limitations:marketData.limitations,updated:marketData.version},summary:String(parsed.summary||''),criteria,quality,acquisition,general,coverage,completeness,investment,confidence:String(parsed.confidence||''),layout:String(parsed.layout||''),warnings:array(parsed.warnings),missing:array(parsed.missing),questions:array(parsed.questions),checklist:array(parsed.checklist)});
}

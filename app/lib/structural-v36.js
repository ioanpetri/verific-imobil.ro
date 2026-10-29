// Verific Imobil v3.6 - screening structural, NU expertiza seismica.
// Regulile si pragurile sunt cele furnizate de utilizator. Nu deducem sisteme structurale din anul cladirii.
export const WEIGHTS = Object.freeze({A:.25,B:.30,C:.20,D:.25});
const clamp = (x,min=0,max=100)=>Math.max(min,Math.min(max,x));
const norm = x=>String(x||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const has=(t,re)=>re.test(t);
const val=(x,defaultValue=null)=>Number.isFinite(Number(x))&&x!==null&&x!==''?Number(x):defaultValue;
function period(year){if(year<1940)return 30;if(year<=1962)return 30;if(year<=1977)return 25;if(year<=1991)return 55;if(year<=2005)return 65;if(year<=2012)return 80;return 90;}
const periodEdges=[1940,1963,1978,1992,2006,2013];
function weightedGeometric(s){return Math.exp(Object.entries(WEIGHTS).reduce((sum,[k,w])=>sum+w*Math.log(Math.max(5,s[k])),0));}
function classification(score){return score>=80?'A':score>=65?'B':score>=50?'C':score>=35?'D':'E';}
function extractYear(t){const authorization=t.match(/(?:autorizati[ae]|autorizat|autorizare|ac\s*nr)[^\d]{0,35}((?:19|20)\d{2})/);const construction=t.match(/(?:construit|constructie|finalizat|edificat|bloc din|anul)[^\d]{0,25}((?:19|20)\d{2})/);return {authorization:authorization?+authorization[1]:null,construction:construction?+construction[1]:null};}
function getStructure(t,year){
 const cases=[[/pereti structurali din beton armat|structura duala/,year>=2006?85:75,'pereti beton / dual'],[/cadre din beton armat|structura in cadre/,year>=1992?75:40,'cadre beton'],[/panouri mari prefabricate|panouri prefabricate/,65,'panouri prefabricate'],[/zidarie confinata/,year>=1992?60:45,'zidarie confinata'],[/structura (?:din )?(?:otel|lemn)/,70,'otel/lemn'],[/zidarie portanta neconfinata/,25,'zidarie neconfinata'],[/chirpici|paianta|piatra fara legaturi/,20,'structura traditionala']];
 for(const [re,score,name] of cases)if(re.test(t))return {score,name,confidence:.7};
 return {score:null,name:null,confidence:0};
}
function calculate(input,scenario='central'){
 const t=norm(input.text);const facts=input.facts||{};const extracted=extractYear(t);
 const year=val(facts.authorizationYear,extracted.authorization)??val(facts.constructionYear,extracted.construction);
 const verifiedYear=facts.authorizationYear!=null||facts.constructionYear!=null;
 let A=year?period(year):null;
 const ambiguous=year&&periodEdges.some(edge=>Math.abs(edge-year)<=2)&&facts.authorizationYear==null;
 if(A!=null&&ambiguous)A=Math.min(A,period(year-2));
 const structure=getStructure(t,year);
 let B=val(facts.structureScore,structure.score);
 const modifiers=[[/parter flexibil|pilotis|parter liber/,-15,'parter flexibil'],[/plansee din lemn|boltite pe grinzi metalice/,-10,'plansee vechi'],[/neregularitate structurala|retrageri structurale|console mari/,-8,'neregularitate'],[/alipire fara rost antiseismic/,-8,'alipire fara rost'],[/plansee din beton armat monolit/,+5,'plansee monolite']];
 const flags=[];if(B!=null)for(const [re,delta,label] of modifiers)if(re.test(t)){B+=delta;flags.push(label);}
 if(B!=null&&year&&year<1978&&/p\s*\+\s*(?:8|9|1\d)|(?:8|9|1\d) etaje/.test(t)){B-=10;flags.push('inaltime mare pre-1978');}
 if(B!=null)B=clamp(B);
 const docs=[['authorization',20,/autorizatie de construire.{0,100}receptie|receptie.{0,100}autorizatie de construire/],['technicalBook',20,/cartea tehnica|carte tehnica/],['expertise',25,/expertiza tehnica|expertiza seismica/],['consolidation',20,/consolidare (?:certificata|autorizata)|proiect de consolidare/],['modifications',10,/autorizatie (?:pentru )?modificari/],['cadastre',5,/carte funciara|extras cf|cadastru/]];
 const docEvidence=docs.map(([key,points,re])=>{const verified=Boolean(facts.verifiedDocuments?.includes(key));const mentioned=re.test(t);const factor=verified?1:mentioned?.5:0;const multiplier=year&&year>2008&&['authorization','technicalBook'].includes(key)?2:year&&year<1978&&['expertise','consolidation'].includes(key)?2:1;return {key,points:points*multiplier,factor};});
 // Documentele neaplicabile nu trebuie sa penalizeze automat; punctajul este normalizat la maximul ponderilor relevante.
 const maxDocs=docEvidence.reduce((s,d)=>s+d.points,0);
 const C=maxDocs?100*docEvidence.reduce((s,d)=>s+d.points*d.factor,0)/maxDocs:null;
 const cracked=/fisuri (?:diagonale|in x|structurale)|fisuri la noduri/.test(t);
 const unauthorized=/pereti demolati fara autorizatie|modificari structurale neautorizate|demolat perete fara autorizatie/.test(t);
 const renovated=/renovat complet|renovare completa|recent renovat/.test(t);
 const deterioration=/degradare|coroziunea armaturii|tasare|infiltratii structurale/.test(t);
 const D1=cracked?15:deterioration?35:null;
 const D2=unauthorized?15:/consolidare certificata|consolidare autorizata/.test(t)?90:null;
 const D3=/acoperis reparat|hidroizolatie refacuta/.test(t)?75:null;
 const D4=renovated?75:null;
 const D5=/alunecare de teren|teren instabil/.test(t)?20:null;
 const parts=[D1,D2,D3,D4,D5],dw=[.30,.30,.15,.10,.15];
 const observedD=parts.reduce((s,x,i)=>s+(x==null?0:dw[i]),0);
 const D=observedD?parts.reduce((s,x,i)=>s+(x==null?0:dw[i]*x),0)/observedD:null;
 const missingValue=scenario==='low'?20:scenario==='high'?85:50;
 const scores={A:A??(scenario==='central'?null:missingValue),B:B??(scenario==='central'?null:missingValue),C:C??(scenario==='central'?null:missingValue),D:D??(scenario==='central'?null:missingValue)};
 const riskClass=(facts.seismicRiskClass||t.match(/\brs\s*(?:i{1,3}|iv|[1-4])\b/)?.[0]||'').toLowerCase().replace(/\s/g,'');
 const veto=[];
 if(year&&year<1978&&/cadre beton|zidarie neconfinata/.test(structure.name||'')&&!docEvidence.find(d=>d.key==='expertise').factor)veto.push({code:'V1',cap:45});
 if(['rsi','rs1'].includes(riskClass)||/bulina rosie/.test(t))veto.push({code:'V2',cap:20});
 if(unauthorized)veto.push({code:'V3',cap:40});
 if(cracked)veto.push({code:'V4',cap:35});
 if(['rsii','rs2'].includes(riskClass))veto.push({code:'V5',cap:50});
 if(['rsiii','rs3'].includes(riskClass))veto.push({code:'V6',cap:70});
 if(year&&year<1978&&/parter flexibil|pilotis|parter liber/.test(t)&&!docEvidence.find(d=>d.key==='expertise').factor)veto.push({code:'V7',cap:40});
 const cA=year?(verifiedYear?1:.7):0,cB=B!=null?(facts.structureScore!=null?1:structure.confidence):0,cC=maxDocs?docEvidence.reduce((s,d)=>s+d.points*d.factor,0)/maxDocs:0,cD=observedD?Math.min(.7,observedD*.7):0;
 const confidence=WEIGHTS.A*cA+WEIGHTS.B*cB+WEIGHTS.C*cC+WEIGHTS.D*cD;
 const complete=Object.values(scores).every(x=>x!=null);
 const raw=complete?weightedGeometric(scores):null;
 const final=raw==null?null:Math.min(raw,...veto.map(v=>v.cap));
 return {scores,raw,final,confidence,veto,flags,year,structure:structure.name,missing:Object.entries(scores).filter(([,v])=>v==null).map(([k])=>k)};
}
export function evaluateStructuralScreening(input){
 const central=calculate(input,'central'),low=calculate(input,'low'),high=calculate(input,'high');
 const confidence=central.confidence;
 const provisional=confidence<.7;
 const score=central.final;
 const interval=[Math.min(low.final,high.final),Math.max(low.final,high.final)].map(v=>Math.round(v*10)/10);
 return {version:'3.6',method:'screening din anunt, nu expertiza',subscores:central.scores,score100:score==null?null:+score.toFixed(1),score10:score==null?null:+(1+9*score/100).toFixed(1),interval,confidence:+confidence.toFixed(2),status:confidence<.4?'date_insuficiente':provisional?'provizoriu':'documentat',class:confidence<.4||score==null?null:classification(score),veto:central.veto,flags:central.flags,missing:central.missing,year:central.year,structure:central.structure,questions:['Solicitati cartea tehnica, autorizatia si procesul-verbal de receptie.','Exista expertiza seismica si ce clasa Rs este mentionata?','Au existat modificari de pereti sau consolidari? Cereti autorizatiile.','Exista fisuri, tasari, infiltratii ori degradari constatate de un specialist?'],disclaimer:'Indice de screening din informatii disponibile; nu reprezinta expertiza tehnica sau certificare de siguranta.'};
}

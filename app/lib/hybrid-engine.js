// Verific Imobil v3.1: reguli auditate + repere de calibrare umana.
// Nu exista acces live autorizat la date de tranzactii sau API Imobiliare.ro.
export const CALIBRATION_CASES = [
 {id:'A',zone:'Manastur',criteria:{structural:6,layout:5,thermal:4,acoustic:6,visual:6,materials:7,liveability:6,neighbourhood:6},quality:6,value:7,investment:6},
 {id:'B',zone:'Zona Garii',criteria:{structural:8,layout:6,thermal:8,acoustic:6,visual:7,materials:8,liveability:8,neighbourhood:6},quality:7,value:6,investment:8},
 {id:'C',zone:'Zorilor',criteria:{structural:8,layout:7,thermal:8,acoustic:7,visual:4,materials:8,liveability:8,neighbourhood:8},quality:8,value:7,investment:8}
];
const p=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const has=(t,r)=>r.test(t);
const clamp=n=>Math.max(1,Math.min(10,Math.round(n*10)/10));
// Guardrails deterministe: numai semnale explicite, nu presupuneri despre defecte.
export function calibrateCriteria(criteria,source){
 const t=p(source); const notes=[];
 const update=(key,sub,score,why)=>{
   const node=criteria?.[key]?.subcriteria?.[sub]; if(!node)return;
   const before=node.score; node.score=clamp(score);
   if(before!==node.score)notes.push({criterion:key,subcriterion:sub,before,after:node.score,reason:why});
 };
 if(has(t,/\bsemi[ -]?decomandat\b/)){
   const node=criteria?.layout?.subcriteria?.distribution;
   if(node && node.score>6.5)update('layout','distribution',6.5,'Semidecomandarea limiteaza flexibilitatea fata de un plan decomandat comparabil.');
 }
 if(has(t,/\bparter\b/)){
   // Fara dovezi de umbrire, nu impunem 4/10 la lumina; limitam supraevaluarea obstacolelor.
   const node=criteria?.visual?.subcriteria?.obstructions;
   if(node && node.score>7)update('visual','obstructions',7,'Parter: intimitatea si obstacolele trebuie verificate, fara a presupune lipsa luminii.');
 }
 if(has(t,/\b(?:infiltratii|igrasie|mucegai)\b/) && !has(t,/\b(?:fara|nu prezinta|nu exista)\s+(?:urme de )?(?:infiltratii|igrasie|mucegai)\b/)){
   const node=criteria?.materials?.subcriteria?.condition;
   if(node && node.score>4)update('materials','condition',4,'Defect mentionat explicit; necesita verificare tehnica.');
 }
 if(has(t,/\b(?:finisaje uzate|finisaje vechi|necesita renovare|de renovat)\b/)){
   const node=criteria?.materials?.subcriteria?.condition;
   if(node && node.score>5)update('materials','condition',5,'Starea uzata este descrisa explicit.');
 }
 // Recalculam scorul numai daca subcriteriile s-au schimbat, ponderile originale raman intacte.
 const subweights={layout:{area:40,distribution:30,bathrooms:15,kitchen:15},visual:{orientation:30,windows:25,obstructions:25,view:20},materials:{quality:35,workmanship:30,design:25,condition:10}};
 for(const key of Object.keys(subweights)){
  if(notes.some(n=>n.criterion===key)){
   criteria[key].score=clamp(Object.entries(subweights[key]).reduce((a,[sub,w])=>a+(criteria[key].subcriteria[sub]?.score||5)*w,0)/100);
   criteria[key].basis += ' Ajustare determinista v3.1 bazata pe caracteristici declarate; verificarea fizica ramane necesara.';
  }
 }
 return notes;
}
export function guardMarketScores(acquisition,investment,source){
 const t=p(source); const notes=[];
 // Nu avem comparabile verificate in acest flux; indicii orasului nu sunt comparabile individuale.
 if(acquisition.subscores.priceValue!==5){notes.push('Pret/calitate: scor neutru 5 in lipsa comparabilelor individuale verificate.');acquisition.subscores.priceValue=5;}
 if(investment.subscores.entryRisk!==5){notes.push('Pret de intrare: scor neutru 5 fara comparabile verificabile.');investment.subscores.entryRisk=5;}
 if(investment.subscores.appreciation!==5){notes.push('Apreciere: scor neutru 5 fara prognoza validata pe segment.');investment.subscores.appreciation=5;}
 // O chirie ipotetica nu reprezinta randament net verificat.
 if(investment.subscores.netYield!==5){notes.push('Randament net: scor neutru 5 pana la chirii comparabile si costuri documentate.');investment.subscores.netYield=5;}
 if(!/\b(?:pret|preț|eur|euro|€)\b/.test(t)) notes.push('Pretul cerut nu este identificat clar in sursa.');
 const round=n=>clamp(n);
 acquisition.score=round(acquisition.subscores.priceValue*.4+acquisition.subscores.buyerDemand*.25+acquisition.subscores.compromises*.2+acquisition.subscores.resale*.15);
 investment.score=round(Object.values(investment.subscores).reduce((a,b)=>a+b,0)/4);
 return notes;
}
export function calibrationReport(weights){
 return CALIBRATION_CASES.map(c=>{
  const predicted=clamp(Object.entries(weights).reduce((sum,[k,w])=>sum+(c.criteria[k]||5)*w,0)/100);
  return {id:c.id,zone:c.zone,reference:c.quality,predicted,error:Math.round((predicted-c.quality)*100)/100};
 });
}

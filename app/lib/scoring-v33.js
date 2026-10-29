// v3.3: transparent, conservative rule adjustments. No market-wide average is an individual comparable.
const norm = s => String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const clamp = n => Math.max(1,Math.min(10,Math.round(n*10)/10));
const RUBRIC = {
 layout:{area:40,distribution:30,bathrooms:15,kitchen:15},
 visual:{orientation:30,windows:25,obstructions:25,view:20},
 materials:{quality:35,workmanship:30,design:25,condition:10},
 acoustic:{between:35,outside:30,position:20,windows:15},
 thermal:{insulation:25,windows:20,heating:25,energy:20,ventilation:10}
};
// Only positive explicit statements, with negation guards. Rules are initial hypotheses, NOT ANEVAR coefficients.
const rules = [
 {id:'layout_decomandat',key:'layout',sub:'distribution',re:/\bdecomandat\b/,exclude:/\b(?:semi|ne)[ -]?decomandat\b/,min:7.5,reason:'Compartimentare decomandata declarata; verificati releveul.'},
 {id:'layout_semidecomandat',key:'layout',sub:'distribution',re:/\bsemi[ -]?decomandat\b/,max:6.5,reason:'Semidecomandat declarat; flexibilitate redusa fata de decomandat.'},
 {id:'layout_nedecomandat',key:'layout',sub:'distribution',re:/\bnedecomandat\b/,max:5,reason:'Nedecomandat declarat; circulatie prin camere.'},
 {id:'materials_renovation',key:'materials',sub:'condition',re:/\b(?:necesita renovare|de renovat|finisaje uzate|finisaje vechi)\b/,max:5,reason:'Finisaje uzate / renovare mentionate explicit.'},
 {id:'materials_moisture',key:'materials',sub:'condition',re:/\b(?:infiltratii|igrasie|mucegai)\b/,exclude:/\b(?:fara|nu prezinta|nu exista)\s+(?:urme de )?(?:infiltratii|igrasie|mucegai)\b/,max:4,reason:'Problema de umiditate mentionata; necesita inspectie.'},
 {id:'acoustic_rail',key:'acoustic',sub:'outside',re:/\b(?:langa calea ferata|adiacent caii ferate|zgomot feroviar|langa sinele de tren)\b/,max:6,reason:'Expunere feroviara mentionata explicit; zgomotul trebuie masurat.'},
 {id:'visual_ground',key:'visual',sub:'obstructions',re:/\bparter\b/,max:7,reason:'Parterul necesita verificarea intimitatii si obstacolelor, fara a presupune umbrire.'}
];
export function applyEvidenceRubric(criteria,source){
 const t=norm(source);const changes=[];
 for(const rule of rules){
  if(!rule.re.test(t)||rule.exclude?.test(t))continue;
  const node=criteria?.[rule.key]?.subcriteria?.[rule.sub];if(!node)continue;
  const old=Number(node.score);if(!Number.isFinite(old))continue;
  const next=clamp(rule.min!=null?Math.max(old,rule.min):Math.min(old,rule.max));
  if(next===old)continue;
  node.score=next;
  changes.push({rule:rule.id,criterion:rule.key,subcriterion:rule.sub,before:old,after:next,reason:rule.reason,source:'regula interna experimentala v3.3'});
 }
 for(const key of Object.keys(RUBRIC)){
  if(!changes.some(c=>c.criterion===key))continue;
  const c=criteria[key];c.score=clamp(Object.entries(RUBRIC[key]).reduce((sum,[sub,w])=>sum+(Number(c.subcriteria[sub]?.score)||5)*w,0)/100);
  c.basis=String(c.basis||'')+' Ajustari explicite: '+changes.filter(x=>x.criterion===key).map(x=>x.reason).join(' ');
 }
 return changes;
}
export function scoreReliability(criteria,market,changes){
 const detail={};const all=[];
 for(const [key,c] of Object.entries(criteria)){
  const evidence=['documented','declared','inferred','estimated'].includes(c.evidence)?c.evidence:'estimated';
  const level=evidence==='documented'?'ridicata':evidence==='declared'?'medie':'scazuta';
  detail[key]={level,evidence,ruleIds:changes.filter(x=>x.criterion===key).map(x=>x.rule),note:evidence==='documented'?'Necesita confirmarea documentelor originale.':evidence==='declared'?'Bazat pe declaratiile din anunt; necesita verificare.':'Date insuficiente pentru validare independenta.'};
  all.push(level);
 }
 return {criteria:detail,market:'context_only',financial:'scazuta',overall:all.every(x=>x==='ridicata')?'ridicata':all.filter(x=>x==='scazuta').length>=4?'scazuta':'medie',notes:['Indicii agregati nu sunt comparabile individuale.','Nu exista estimare neta de chirie sau pret de tranzactie actual verificat.']};
}
export function investmentScenario({price,area,rentPerSqm,occupancy=0.92,annualCosts=0,acquisitionCosts=0,initialWorks=0}){
 if(![price,area,rentPerSqm,occupancy,annualCosts,acquisitionCosts,initialWorks].every(Number.isFinite)||price<=0||area<=0||rentPerSqm<=0||occupancy<0||occupancy>1||annualCosts<0||acquisitionCosts<0||initialWorks<0)return null;
 const rent=area*rentPerSqm;
 const gross=12*rent/price*100;
 const net=(12*rent*occupancy-annualCosts)/(price+acquisitionCosts+initialWorks)*100;
 return {rentEurMonth:Math.round(rent),grossYieldPercent:+gross.toFixed(2),illustrativeNetYieldPercent:+net.toFixed(2),assumptions:{occupancy,annualCosts,acquisitionCosts,initialWorks},verified:false};
}

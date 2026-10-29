import config from '../config/algorithm-v34.js';

const finite = x => typeof x === 'number' && Number.isFinite(x);
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
const round = (x,d=1) => Number(x.toFixed(d));
export function lin(x,a,b){if(![x,a,b].every(finite)||a===b)return null;return round(1+9*clamp((x-a)/(b-a),0,1),3);}
export function weighted(values,weights,{omitMissing=false}={}){
  let sum=0,total=0;const missing=[];
  for(const [k,w] of Object.entries(weights)){
    if(!finite(values?.[k])||values[k]<1||values[k]>10){missing.push(k);continue;}
    sum+=values[k]*w;total+=w;
  }
  if(!total||(!omitMissing&&missing.length))return {score:null,missing,coverage:round(total,3)};
  return {score:round(sum/total,3),missing,coverage:round(total,3)};
}
export function powerGeneral(scores,profile='home'){
  const w=config.profiles[profile];if(!w)throw new Error('Profil necunoscut');
  if(Object.keys(w).some(k=>!finite(scores[k])||scores[k]<1||scores[k]>10))return null;
  return round(Math.pow(Object.entries(w).reduce((s,[k,v])=>s+v*Math.sqrt(scores[k]),0),2),1);
}
export function netYield({price,monthlyRent,vacancyMonths,annualOperatingCosts=0,annualTax=0,entryCosts=0}){
  if(![price,monthlyRent,vacancyMonths,annualOperatingCosts,annualTax,entryCosts].every(finite)||price<=0||monthlyRent<0||vacancyMonths<0||vacancyMonths>12||annualOperatingCosts<0||annualTax<0||entryCosts<0)return null;
  const annualNet=monthlyRent*(12-vacancyMonths)-annualOperatingCosts-annualTax;
  return {annualNet:round(annualNet,2),yieldPct:round(annualNet/(price+entryCosts)*100,3)};
}
export function irr(cashflows){
  if(!Array.isArray(cashflows)||cashflows.length<2||!cashflows.every(finite)||cashflows[0]>=0||!cashflows.slice(1).some(x=>x>0))return null;
  const npv=r=>cashflows.reduce((s,v,i)=>s+v/Math.pow(1+r,i),0);
  let low=-0.999,high=10;
  if(npv(low)*npv(high)>0)return null;
  for(let i=0;i<120;i++){const mid=(low+high)/2;if(npv(low)*npv(mid)<=0)high=mid;else low=mid;}
  return round((low+high)*50,4);
}
export function investmentIndicators(input={}){
  const out={};const y=netYield(input);
  out.yieldPct=y?.yieldPct??null;
  out.yield=out.yieldPct===null?null:lin(out.yieldPct,...config.normalization.yieldPct);
  const benchmark=finite(input.benchmarkRatePct)?input.benchmarkRatePct:null;
  out.irrBasePct=Array.isArray(input.cashflowsBase)?irr(input.cashflowsBase):null;
  out.irrBearPct=Array.isArray(input.cashflowsBear)?irr(input.cashflowsBear):null;
  out.irrSpread=out.irrBasePct===null||benchmark===null?null:lin(out.irrBasePct-benchmark,...config.normalization.irrSpreadPct);
  out.bear=out.irrBearPct===null?null:lin(out.irrBearPct,...config.normalization.bearIrrPct);
  out.debtCoverage=finite(input.dscr)?lin(input.dscr,...config.normalization.dscr):null;
  return out;
}
export function evaluateAlgorithmV34(input={}){
  const profile=input.profile||'home';
  const components={};
  for(const [k,w] of Object.entries(config.livingComponents)){
    const weights=k==='location'&&input.schoolsRelevant===false?Object.fromEntries(Object.entries(w).filter(([key])=>key!=='schools')):w;
    components[k]=weighted(input.livingIndicators?.[k],weights);
  }
  const livingValues=Object.fromEntries(Object.entries(components).map(([k,v])=>[k,v.score]));
  const living=weighted({...livingValues,costs:input.livingIndicators?.costs},config.living);
  const acqWeights={...config.acquisition};
  if(input.budgetProvided===false)delete acqWeights.affordability;
  const acquisition=weighted(input.acquisition,acqWeights);
  const invWeights={...config.investment};
  if(input.financed===false)delete invWeights.debtCoverage;
  const investment=weighted(input.investment,invWeights);
  const gates=[];const risk=input.verifiedRisks||{};
  if(risk.seismicRsI===true||risk.consolidationRequired===true){if(living.score!==null)living.score=Math.min(living.score,4);gates.push({id:'seismic',generalMax:3.5});}
  if(risk.seriousLegalIssue===true){if(acquisition.score!==null)acquisition.score=Math.min(acquisition.score,3);gates.push({id:'legal',generalMax:4});}
  if(risk.highFloodOrActiveLandslide===true){if(living.score!==null)living.score=Math.min(living.score,4);gates.push({id:'naturalRisk',generalMax:5});}
  if(input.budgetProvided===true&&finite(input.dsti)&&input.dsti>0.5){if(acquisition.score!==null)acquisition.score=Math.min(acquisition.score,5);gates.push({id:'dsti'});}
  const scores={living:living.score,acquisition:acquisition.score,investment:investment.score};
  let general=powerGeneral(scores,profile);
  if(general!==null)for(const gate of gates)if(finite(gate.generalMax))general=Math.min(general,gate.generalMax);
  const evidence=Array.isArray(input.evidence)?input.evidence:[];
  const totalWeight=evidence.reduce((s,e)=>s+(finite(e.weight)&&e.weight>0?e.weight:0),0);
  const confidence=totalWeight?round(evidence.reduce((s,e)=>s+(finite(e.weight)&&e.weight>0?e.weight:0)*(config.evidenceConfidence[e.type]??0),0)/totalWeight,3):null;
  return {version:config.version,profile,scores:{...scores,general},components,missing:{living:living.missing,acquisition:acquisition.missing,investment:investment.missing},coverage:{living:living.coverage,acquisition:acquisition.coverage,investment:investment.coverage},gates,confidence,provisional:confidence===null||confidence<config.gates.provisionalConfidence,method:'Determinist; fara imputarea indicatorilor necunoscuti'};
}
export {config as algorithmV34Config};

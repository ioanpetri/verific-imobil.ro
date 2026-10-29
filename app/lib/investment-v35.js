// Investment scoring v3.5. Source: user-supplied methodology (October 2026).
// Inputs are explicit measured/verified indicators; missing data never becomes a neutral score.
const finite = x => typeof x === 'number' && Number.isFinite(x);
const round = (x,d=2) => Number(x.toFixed(d));
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
export const lin = (x,a,b) => finite(x)&&a!==b ? round(1+9*clamp((x-a)/(b-a),0,1),3) : null;
const weights = {
  RN:{Y1:.40,Y2:.15,Y3:.15,Y4:.15,Y5:.15},
  PA:{G:.35,V:.20,D:.15,O:.15,C:.15},
  LR:{T:.25,Dp:.20,Tp:.15,Dsc:.15,Bz:.10,Vz:.15},
  PR:{P:.30,T:.10,J:.20,S:.15,Dz:.10,Z:.10,F:.05}
};
export const strategies = {
  cashflow:{RN:.45,PA:.15,LR:.15,PR:.25},
  balanced:{RN:.30,PA:.30,LR:.20,PR:.20},
  growth:{RN:.15,PA:.45,LR:.15,PR:.25},
  conservative:{RN:.25,PA:.15,LR:.25,PR:.35}
};
function combine(scores,w,excluded=[]){
  const active=Object.entries(w).filter(([k])=>!excluded.includes(k));
  const missing=active.filter(([k])=>!finite(scores[k])||scores[k]<1||scores[k]>10).map(([k])=>k);
  const coverage=round(active.reduce((s,[k,v])=>s+(missing.includes(k)?0:v),0)/active.reduce((s,[,v])=>s+v,0),3);
  if(missing.length)return {score:null,missing,coverage};
  const sum=active.reduce((s,[k,v])=>s+scores[k]*v,0);
  return {score:round(sum/active.reduce((s,[,v])=>s+v,0),2),missing:[],coverage:1};
}
export function investmentV35(input={}){
  const strategy=input.strategy||'balanced';
  if(!strategies[strategy])throw new Error('Strategie necunoscuta');
  const d=input.data||{};
  const f={};
  const req=(...keys)=>keys.every(k=>finite(d[k]));
  // Money values in EUR, percentage/rates in decimal fractions (e.g. .03 = 3%).
  const E=req('monthlyRent','vacancyMonths')&&d.monthlyRent>=0&&d.vacancyMonths>=0&&d.vacancyMonths<=12?d.monthlyRent*(12-d.vacancyMonths):null;
  const TCA=req('transactionPrice','acquisitionFees','renovation','furnishing','initialFinanceCosts')&&d.transactionPrice>0&&['acquisitionFees','renovation','furnishing','initialFinanceCosts'].every(k=>d[k]>=0)?d.transactionPrice+d.acquisitionFees+d.renovation+d.furnishing+d.initialFinanceCosts:null;
  const opex=req('localTax','insurance','maintenance','uncoveredExpenses','management','reletting')&&['localTax','insurance','maintenance','uncoveredExpenses','management','reletting'].every(k=>d[k]>=0)?['localTax','insurance','maintenance','uncoveredExpenses','management','reletting'].reduce((s,k)=>s+d[k],0):null;
  const tax=E!==null&&req('rentalTaxRate','rentalTaxableFraction')?E*d.rentalTaxRate*d.rentalTaxableFraction:null;
  const NOI=E!==null&&opex!==null&&tax!==null&&req('cass')?E-opex-tax-d.cass:null;
  const yn=NOI!==null&&TCA!==null&&TCA>0?NOI/TCA:null;
  const dscr=NOI!==null&&req('annualDebtService')&&d.annualDebtService>0?NOI/d.annualDebtService:null;
  const stressE=req('monthlyRent','vacancyMonths')?d.monthlyRent*.9*Math.max(0,11-d.vacancyMonths):null;
  const stressNOI=stressE!==null&&opex!==null&&req('rentalTaxRate','rentalTaxableFraction','cass')?stressE-opex*1.2-stressE*d.rentalTaxRate*d.rentalTaxableFraction-d.cass:null;
  const stressYield=stressNOI!==null&&TCA>0?stressNOI/TCA:null;
  const gFund=req('expectedInflation','realWageGrowth','localPTI','historicalPTI')&&d.historicalPTI>0?d.expectedInflation+.5*d.realWageGrowth-.3*(d.localPTI/d.historicalPTI-1):null;
  const gBase=gFund!==null&&req('localCagr36')?clamp(.5*d.localCagr36+.5*gFund,-.02,.08):null;
  const gBear=gBase===null?null:gBase-.04;
  const scores={
    RN:{Y1:lin(yn,.015,.05),Y2:yn!==null&&req('riskFreeNet')?lin(yn-d.riskFreeNet,-.04,.01):null,Y3:lin(dscr,1,1.6),Y4:finite(d.rentalDemandScore)?clamp(d.rentalDemandScore,1,10):null,Y5:yn!==null&&yn>0&&stressYield!==null?lin(stressYield/yn,.55,.90):null},
    PA:{G:gBase===null?null:round(.6*lin(gBase,0,.07)+.4*lin(gBear,-.04,.03),3),V:req('pricePerSqm','fairPricePerSqm')&&d.fairPricePerSqm>0?lin(d.pricePerSqm/d.fairPricePerSqm,1.15,.85):null,D:finite(d.demandFundamentalsScore)?d.demandFundamentalsScore:null,O:req('futureSupplyRatio')?lin(d.futureSupplyRatio,.12,.02):null,C:finite(d.confirmedCatalystsScore)?d.confirmedCatalystsScore:null},
    LR:{T:lin(d.daysOnMarket,180,30),Dp:finite(d.marketDepthScore)?d.marketDepthScore:null,Tp:finite(d.typologyScore)?d.typologyScore:null,Dsc:lin(d.exitDiscountRate,.12,.02),Bz:lin(d.priceToHouseholdIncome,12,6),Vz:finite(d.saleabilityScore)?d.saleabilityScore:null},
    PR:{P:req('fairPrice','transactionPrice')&&d.fairPrice>0?lin((d.fairPrice-d.transactionPrice)/d.fairPrice,-.2,.2):null,T:TCA!==null&&req('fairPrice')&&d.fairPrice>0?lin(TCA/d.fairPrice,1.15,1.03):null,J:finite(d.legalScore)?d.legalScore:null,S:finite(d.technicalScore)?d.technicalScore:null,Dz:finite(d.developerRiskScore)?d.developerRiskScore:null,Z:finite(d.zoneRiskScore)?d.zoneRiskScore:null,F:finite(d.financialRiskScore)?d.financialRiskScore:null}
  };
  const exclusions={RN:input.financed===false?['Y3']:[],PA:[],LR:[],PR:[...(input.newDevelopment===false?['Dz']:[]),...(input.financed===false?['F']:[])]};
  const components=Object.fromEntries(Object.entries(weights).map(([k,w])=>[k,combine(scores[k],w,exclusions[k])]));
  const gates=[];
  const r=input.verifiedRisks||{};
  const cap=(id,max)=>gates.push({id,compositeMax:max});
  if(r.seismicRsI===true||r.consolidationRequired===true){if(components.PR.score!==null)components.PR.score=Math.min(components.PR.score,3);cap('seismic',3.5);}
  if(r.seriousLegalIssue===true){if(components.PR.score!==null)components.PR.score=Math.min(components.PR.score,3);cap('legal',4);}
  if(r.highFloodOrActiveLandslide===true){if(components.PR.score!==null)components.PR.score=Math.min(components.PR.score,4);cap('natural',5);}
  if(yn!==null&&req('riskFreeNet','expectedInflation')&&yn<d.riskFreeNet&&gBase!==null&&gBase<d.expectedInflation)cap('lowReturn',5.5);
  if(dscr!==null&&dscr<1){if(components.RN.score!==null)components.RN.score=Math.min(components.RN.score,3);gates.push({id:'debtCoverage'});}
  if(components.LR.score!==null&&components.LR.score<4)cap('illiquid',6);
  const all=Object.keys(strategies[strategy]).every(k=>components[k].score!==null);
  let composite=all?round(Math.pow(Object.entries(strategies[strategy]).reduce((s,[k,w])=>s+w*Math.sqrt(components[k].score),0),2),1):null;
  if(composite!==null)for(const g of gates)if(finite(g.compositeMax))composite=Math.min(composite,g.compositeMax);
  const ev=Array.isArray(input.evidence)?input.evidence:[];
  const evidenceWeight=ev.reduce((s,x)=>s+(finite(x.weight)&&x.weight>0?x.weight:0),0);
  const confidence=evidenceWeight?round(ev.reduce((s,x)=>s+(finite(x.weight)&&x.weight>0?x.weight:0)*({official:1,measured:.7,estimated:.5,assumed:.2}[x.type]??0),0)/evidenceWeight,3):null;
  return {version:'3.5.0',strategy,indicators:scores,components,composite,financials:{effectiveRent:E,totalAcquisitionCost:TCA,annualOperatingCosts:opex,rentalTax:tax,annualNetIncome:NOI,netYieldPct:yn===null?null:round(yn*100,3),stressYieldPct:stressYield===null?null:round(stressYield*100,3),dscr,gBase,gBear},gates,confidence,provisional:confidence===null||confidence<.6,complete:all,method:'Metodologie determinista; lipsa datelor nu este imputata cu 5/10'};
}

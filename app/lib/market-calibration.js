// Market calibration v3.2.1: source-backed context, not an individual appraisal.
import market from '../data/market-cluj.json' with { type: 'json' };
const number = x => Number.isFinite(x) ? x : null;
export function marketPosition(source) {
  const text = String(source || '').replace(/\s+/g, ' ');
  const priceCandidates = [...text.matchAll(/(?:€\s*|\b(?:pret|preț|price)\s*[:=]?\s*|\bEUR\s*)(\d{2,3}(?:[.\s]\d{3})+(?:,\d{1,2})?|\d{5,6})(?:\s*(?:€|EUR))?/gi)]
    .map(m=>Number(m[1].replace(/[.\s]/g,'').replace(',','.'))).filter(v=>v>=25000&&v<=3000000);
  const alternate = [...text.matchAll(/\b(\d{2,3}(?:[.\s]\d{3})+|\d{5,6})\s*(?:€|EUR|euro)\b/gi)]
    .map(m=>Number(m[1].replace(/[.\s]/g,''))).filter(v=>v>=25000&&v<=3000000);
  const prices=[...new Set([...priceCandidates,...alternate])];
  const areaMatch=text.match(/(?:suprafata(?:\s+utila)?|suprafața(?:\s+utilă)?|utili|utila|utilă)\s*[:=]?\s*(\d{2,3}(?:[.,]\d+)?)\s*(?:mp|m²)/i)
    ||text.match(/\b(\d{2,3}(?:[.,]\d+)?)\s*(?:mp|m²)\s*(?:utili|utila|utilă)?\b/i);
  const area=areaMatch?Number(areaMatch[1].replace(',','.')):null;
  const price=prices.length===1?prices[0]:null;
  const validArea=area>=18&&area<=300?area:null;
  const askingSqm=price&&validArea?Math.round(price/validArea):null;
  const ref=market.benchmarks.find(b=>b.source==='Imobiliare.ro Indice'&&b.period==='2026-09'&&b.segment==='all');
  const deviation=askingSqm&&ref?Math.round((askingSqm/ref.value-1)*1000)/10:null;
  const rent=market.benchmarks.find(b=>b.source==='Castela'&&b.metric==='rent_asking_eur_sqm_month');
  const hypotheticalRent=validArea&&rent?Math.round(validArea*rent.value):null;
  const grossYield=price&&hypotheticalRent?Math.round((hypotheticalRent*12/price)*1000)/10:null;
  return {askingPriceEur:price,areaSqm:validArea,askingEurSqm:askingSqm,cityAskingBenchmarkEurSqm:ref?.value??null,
    deviationFromCityAskingPercent:deviation,countyRentScenarioEurMonth:hypotheticalRent,hypotheticalGrossYieldPercent:grossYield,
    scoreAdjustmentApplied:false,confidence:'context_only',
    notes:['Abaterea fata de indicele municipal NU este un scor de pret corect pentru un apartament individual.',
      'Scenariul de chirie foloseste mediana JUDETEANA, nu chirii comparabile din microzona; randamentul este BRUT si ipotetic.',
      'Nu sunt disponibile comparabile individuale, costuri, grad de ocupare sau preturi recente de tranzactionare.']};
}
export function marketPrompt(){return market.benchmarks.map(b=>`${b.source}: ${b.metric}, ${b.segment}, ${b.period}, ${b.value} ${b.unit||''}, ${b.kind}, ${b.scope||market.scope}`).join('\n')+'\nAcestea sunt agregate, nu comparabile individuale. Nu transforma indicatorii in scor de pret sau randament net fara date comparabile.';}

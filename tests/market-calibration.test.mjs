import assert from 'node:assert/strict';
import { marketPosition, marketPrompt } from '../app/lib/market-calibration.js';
const a=marketPosition('Pret: 160000 EUR, suprafata utila 45 mp, 2 camere');
assert.equal(a.askingPriceEur,160000);assert.equal(a.areaSqm,45);assert.equal(a.askingEurSqm,3556);
assert.equal(a.cityAskingBenchmarkEurSqm,3316);assert.equal(a.scoreAdjustmentApplied,false);
assert.equal(a.countyRentScenarioEurMonth,450);assert.equal(a.hypotheticalGrossYieldPercent,3.4);
assert.equal(marketPosition('apartament 2 camere 45 mp').hypotheticalGrossYieldPercent,null);
assert.match(marketPrompt(),/ANEVAR/);assert.match(marketPrompt(),/Market360/);assert.match(marketPrompt(),/Castela/);
console.log('Market calibration tests OK');

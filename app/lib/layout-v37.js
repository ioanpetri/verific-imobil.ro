// Verific Imobil v3.7 - metodologia utilizatorului, screening functional 1-10.
// Necunoscut != defect; scorul partial nu inlocuieste nota fara acoperire suficienta.
const clamp=(x,a=1,b=10)=>Math.max(a,Math.min(b,x));
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const num=x=>Number.isFinite(Number(x))&&x!==null&&x!==''?Number(x):null;
const round=x=>x==null?null:Math.round(x*100)/100;
const get=(t,re)=>{const m=t.match(re);return m?Number(m[1].replace(',','.')):null;};
const grade=(r,edges,values)=>{for(let i=0;i<edges.length;i++)if(r>=edges[i])return values[i];return values[values.length-1];};
const areaScore=r=>grade(r,[1.3,1.15,1,.9,.8,.7,.6,.5,.4],[10,9,8,7,6,5,4,3,2,1]);
const roomScore=(s,living)=>grade(s,living?[20,18,15,12,9]:[12,10,8,6],living?[10,9,8,6,4,2]:[10,8,6,4,2]);
const kitchenScore=r=>grade(r,[1.3,1.1,1,.85,.7,.5],[10,9,8,7,5,4,2]);
const evidence={plan:1,explicit:.7,vague:.4,inferred:.3,absent:0};
function extract(text,facts={}){
 const t=norm(text);const issues=[];
 const pick=(key,regex)=>num(facts[key])??get(t,regex);
 const constructed=pick('constructedArea',/(?:suprafata construita|construita)\s*(?:de|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:mp|m2)/);
 let area=pick('usableArea',/(?:suprafata utila|utili|utila)\s*(?:de|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:mp|m2)/);
 let areaC=area!=null?(facts.planVerified?1:.7):0;
 if(area==null&&constructed!=null){area=constructed*.8;areaC=.3;issues.push('Suprafata utila dedusa ca 80% din cea construita.');}
 const balcony=pick('balconyArea',/(?:balcon|logie|terasa)\s*(?:de|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:mp|m2)/);
 if(area!=null&&balcony!=null&&/suprafata utila[^.\n]{0,90}inclusiv balcon/.test(t)){area-=balcony*.5;issues.push('Suprafata ajustata orientativ pentru balcon inclus.');}
 if(area!=null&&constructed!=null&&area>constructed)issues.push('Inconsistenta: suprafata utila depaseste suprafata construita.');
 const rooms=pick('rooms',/(\d+)\s*(?:camere|camera)\b/)??(/garsoniera|studio/.test(t)?1:null);
 const bedrooms=pick('bedrooms',/(\d+)\s*dormitoare\b/)??(rooms!=null?Math.max(1,rooms-1):null);
 const distribution= facts.distribution || (/semidecomandat/.test(t)?'semidecomandat':/nedecomandat|\bcomandat\b/.test(t)?'comandat':/decomandat/.test(t)?'decomandat':/circular/.test(t)?'circular':/open[ -]?space/.test(t)?'open-space':rooms===1?'studio':null);
 const bathrooms=pick('bathrooms',/(\d+)\s*(?:bai|baie|grupuri sanitare complete)\b/);
 const toilets=pick('separateToilets',/(\d+)\s*(?:wc|toalete)\s*(?:separate|de serviciu)/)??0;
 const kitchenArea=pick('kitchenArea',/(?:bucatarie|zona de gatit)\s*(?:de|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:mp|m2)/);
 const bedroomAreas=Array.isArray(facts.bedroomAreas)?facts.bedroomAreas.map(num).filter(x=>x!=null):[];
 const livingArea=num(facts.livingArea);
 return {t,area,areaC,constructed,rooms,bedrooms,distribution,bathrooms,toilets,kitchenArea,bedroomAreas,livingArea,balcony,issues,facts};
}
function compute(d,mode='central'){
 const {t,facts}=d;const missing=mode==='low'?2:mode==='high'?9:5;
 const available=x=>x==null?missing:x;
 const ref=d.rooms==null?null:d.rooms===1?(/garsoniera|studio/.test(t)?28:35):d.rooms===2?50:d.rooms===3?70:d.rooms===4?90:110;
 const A1=d.area!=null&&ref!=null?areaScore(d.area/ref):null;
 const sizes=[...d.bedroomAreas.map(x=>roomScore(x,false)),...(d.livingArea!=null?[roomScore(d.livingArea,true)]:[])];
 const A2=sizes.length?sizes.reduce((a,b)=>a+b,0)/sizes.length:A1!=null?clamp(A1-1):null;
 const perRoom=d.area!=null&&d.rooms?d.area/d.rooms:null;
 const A3=perRoom==null?null:perRoom>=18?(perRoom<=30?9:8):perRoom>=14?6:3;
 const A=.5*available(A1)+.3*available(A2)+.2*available(A3);
 const base={decomandat:9,semidecomandat:7,'open-space':7,studio:6,comandat:4,circular:3};
 let B=d.distribution?base[d.distribution]:null;
 if(B!=null){
  if(facts.separateDayNight===true)B+=.5;
  if(num(facts.hallArea)!=null&&facts.hallArea>=3)B+=.5;
  if(facts.noHall===true)B-=1;
  B-=2*(num(facts.passageRooms)??0);
  if(num(facts.hallArea)!=null&&d.area&&facts.hallArea/d.area>.15)B-=1;
  if(facts.bedroomWithoutWindow===true||/dormitor fara fereastra/.test(t))B-=3;
  if(facts.bedroomWithoutPrivacy===true)B-=1;
  if(facts.entryDirectLiving===true)B-=.5;
  if(facts.duplexStairsShare!=null&&facts.duplexStairsShare>.08)B-=.5;
  if(facts.duplexBedroomViaLiving===true)B-=.5;
  B=clamp(B);
 }
 const beq=d.bathrooms==null?null:d.bathrooms+.5*d.toilets;
 const bathRows={1:[8,10,10,10,10],2:[6,8,10,10,10],3:[4,6,9,10,10],4:[2,4,6,8,10]};
 const dcount=d.bedrooms==null?null:Math.min(4,Math.max(1,d.bedrooms));
 const bi=beq==null?null:beq===0?-1:beq<1.5?0:beq<2?1:beq<2.5?2:beq<3?3:4;
 let C=bi==null||dcount==null?null:bi===-1?1:bathRows[dcount][bi];
 if(C!=null){if(facts.ensuite===true)C+=.5;if(facts.smallBathroom===true)C-=1;if(facts.noBathroomVentilation===true)C-=1;if(facts.onlyBathroomThroughBedroom===true)C-=2;if(facts.bathroomEachLevel===true)C+=.5;C=clamp(C);}
 const kref=d.bedrooms==null?null:d.bedrooms<=1?6:d.bedrooms===2?8:d.bedrooms===3?10:12;
 let D1=d.kitchenArea!=null&&kref!=null?kitchenScore(d.kitchenArea/kref):null;
 if(D1!=null){if(facts.diningFour===true)D1+=.5;if(facts.kitchenNoWindowOrExtraction===true)D1-=2;if(facts.kitchenIsland===true)D1+=.5;if(facts.openKitchenNoOdourSeparation===true)D1-=.5;D1=clamp(D1);}
 let pts=0;let storageKnown=false;
 for(const [key,p] of [['pantry',3],['dressing',3],['atticOrGarage',2],['cellar',2],['builtInWardrobes',1.5],['enclosedBalcony',1],['openBalcony',.5]]){
  const expressions={pantry:/\bdebara\b/,dressing:/\bdressing\b/,atticOrGarage:/\bpod utilizabil|\bgaraj\b/,cellar:/\bboxa\b|\bpivnita\b/,builtInWardrobes:/dulapuri incorporat|mobilier la comanda/,enclosedBalcony:/balcon inchis|logie inchisa/,openBalcony:/balcon deschis/};
  if(facts[key]===true||expressions[key].test(t)){pts+=p;storageKnown=true;}
 }
 if(facts.storageConfirmedAbsent===true)storageKnown=true;
 const ptsRef=d.bedrooms==null?null:d.bedrooms<=1?5:d.bedrooms===2?6:d.bedrooms===3?7:8;
 const D2=storageKnown&&ptsRef!=null?1+9*Math.min(1,pts/ptsRef):null;
 const D=.55*available(D1)+.45*available(D2);
 const S={A:clamp(A),B:available(B),C:available(C),D:clamp(D)};
 const M=.3*S.A+.3*S.B+.2*S.C+.2*S.D;
 const weak=Math.min(...Object.values(S))+3.5;
 const veto=[];
 if(facts.bedroomWithoutWindow===true||/dormitor fara fereastra/.test(t))veto.push({code:'V1',cap:5});
 if(beq===0)veto.push({code:'V2',cap:3});
 if(perRoom!=null&&perRoom<12)veto.push({code:'V3',cap:5});
 if(d.bedrooms>=3&&facts.passageBedroom===true)veto.push({code:'V4',cap:6});
 if(d.area==null&&d.rooms==null)veto.push({code:'V5',cap:null});
 const final=clamp(Math.min(M,weak,...veto.filter(v=>v.cap!=null).map(v=>v.cap)));
 return {subscores:Object.fromEntries(Object.entries(S).map(([k,v])=>[k,round(v)])),details:{A1,A2,A3,D1,D2,beq},score:round(final),veto,raw:round(M)};
}
export function evaluateLayoutScreening(input={}){
 const d=extract(input.text||'',input.facts||{});
 const central=compute(d),lo=compute(d,'low'),hi=compute(d,'high');
 const cA=d.area!=null&&d.rooms!=null?Math.min(d.areaC,d.bedroomAreas.length||d.livingArea!=null?d.facts.planVerified?1:.7:.3):0;
 const cB=d.distribution?d.facts.planVerified?1:.7:0;
 const cC=d.bathrooms!=null?d.facts.planVerified?1:.7:0;
 const cD=d.kitchenArea!=null||d.facts.storageConfirmedAbsent===true?d.facts.planVerified?1:.7:d.kitchenArea==null?0:.3;
 const confidence=round(.3*cA+.3*cB+.2*cC+.2*cD);
 const missing=[];
 if(d.area==null)missing.push('Suprafata utila');if(d.rooms==null)missing.push('Numarul de camere');
 if(!d.distribution)missing.push('Tipul compartimentarii');if(d.bathrooms==null)missing.push('Numarul bailor');
 if(d.kitchenArea==null)missing.push('Suprafata bucatariei');if(!d.bedroomAreas.length&&d.livingArea==null)missing.push('Dimensiunile camerelor');
 const questions=missing.map(x=>`Solicitati confirmarea: ${x.toLowerCase()}.`);
 const interval=[Math.min(lo.score,central.score,hi.score),Math.max(lo.score,central.score,hi.score)];
 const score=central.veto.some(v=>v.code==='V5')?null:central.score;
 const cls=confidence<.4?'Date insuficiente':score>=9?'Excelent':score>=7.5?'Foarte bun':score>=6?'Bun':score>=4?'Limitat':'Deficitar';
 return {version:'3.7',score,subscores:central.subscores,details:central.details,interval,confidence,class:cls,provisional:confidence<.7,veto:central.veto,missing,questions,warnings:d.issues,method:'Scor functional orientativ, nu evaluare tehnica. Planul imbunatateste increderea, nu nota.'};
}

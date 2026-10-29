// Verific Imobil v3.8: port of the user's thermal comfort algorithm.
// Proxy values and priors are heuristics, not energy measurements.
const clip=(x,a=0,b=100)=>Math.max(a,Math.min(b,x));
const W={izolatie:.30,ferestre:.20,incalzire:.20,eficienta:.20,ventilatie:.10};
const priors={izolatie:[25,20,18,30,55,72,82],ferestre:[25,25,25,40,60,75,85],incalzire:[35,45,50,55,65,75,85],eficienta:[20,18,18,32,52,70,85],ventilatie:[50,45,45,40,45,55,70]};
const boundaries=[1960,1977,1990,2005,2013,2020];
const prior=(key,year)=>year==null?40:priors[key][boundaries.filter(y=>year>=y).length];
const norm=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const match=(t,re)=>{const m=t.match(re);return m?Number(m[1].replace(',','.')):null};
const bool=(t,re)=>re.test(t)?true:null;
export function extractThermalFacts(text='',overrides={}){
 const t=norm(text);
 const year=match(t,/(?:construit|constructie|finalizat|edificat|bloc din|anul)\s*(?:in|:)?\s*(19\d{2}|20\d{2})/);
 const f={an_constructie:year,pozitie:/ultim(?:ul)? etaj|etaj \d+\/\d+\s*ultim/.test(t)?'ultim_etaj':/\bparter\b/.test(t)?'parter':null,
 apartament_colt:bool(t,/apartament de colt/),orientare:/\btraversant\b/.test(t)?'traversant':/orientare sud|orientat sud/.test(t)?'S':/orientare nord|orientat nord/.test(t)?'N':null,
 mucegai_semnalat:/mucegai|igrasie|condens persistent/.test(t),
 tip_perete:/beton prefabricat|panouri prefabricate/.test(t)?'beton_prefabricat':/caramida plina/.test(t)?'caramida_plina':/caramida cu goluri/.test(t)?'caramida_goala':/\bbca\b/.test(t)?'bca':null,
 izolatie_tip:/vata minerala|vata bazaltica/.test(t)?'vata_minerala':/polistiren extrudat|\bxps\b/.test(t)?'xps':/polistiren|\beps\b/.test(t)?'eps':null,
 izolatie_cm:match(t,/(?:izolat(?:ie)?|polistiren|vata minerala|vata bazaltica)[^.;\n]{0,35}?(\d{1,2}(?:[.,]\d+)?)\s*cm/),
 acoperis_terasa_izolat:bool(t,/terasa izolata|acoperis izolat/),
 ferestre_material:/tamplarie pvc|ferestre pvc|termopan pvc/.test(t)?'pvc':/aluminiu cu rupere termica/.test(t)?'aluminiu_rpt':null,
 ferestre_geam:/tripan|triplu vitraj|geam triplu/.test(t)?'triplu':/termopan|geam dublu|dublu vitraj/.test(t)?'dublu':null,
 ferestre_low_e:bool(t,/low[ -]?e|low emissivity/),ferestre_an:match(t,/(?:ferestre|tamplarie)[^.;\n]{0,35}?(20\d{2}|19\d{2})/),
 protectie_solara:bool(t,/rulouri exterioare|jaluzele exterioare|obloane/),
 incalzire_tip:/pompa de caldura/.test(t)?'pompa_caldura':/centrala in condensare|centrala condensatie/.test(t)?'centrala_condensatie':/centrala proprie|centrala pe gaz|centrala termica/.test(t)?'centrala_gaz':/termoficare|incalzire centralizata/.test(t)?'termoficare':/incalzire electrica/.test(t)?'electric':null,
 distributie:/incalzire in pardoseala/.test(t)?'pardoseala':/radiatoare|calorifere/.test(t)?'radiatoare':null,
 reglaj:[...(/termostat smart/.test(t)?['termostat_smart']: /termostat/.test(t)?['termostat']:[]),...(/robineti termostatici/.test(t)?['robineti_termostatici']:[])],
 clasa_energetica:(t.match(/clasa energetica\s*[:\-]?\s*(a\+|[a-g])\b/)||[])[1]?.toUpperCase()||null,
 consum_kwh_mp_an:match(t,/(\d+(?:[.,]\d+)?)\s*kwh\s*\/\s*(?:mp|m2)\s*\/\s*an/),
 fotovoltaic:bool(t,/panouri fotovoltaice/),ventilatie_tip:/recuperare de caldura|\bhrv\b/.test(t)?'hrv':/ventilatie mecanica/.test(t)?'mecanica':/ventilatie naturala/.test(t)?'naturala':null,
 hota_evacuare:bool(t,/hota cu evacuare/),baie_cu_fereastra:bool(t,/baie cu fereastra/)};
 return {...f,...overrides};
}
const rWall={beton_prefabricat:.4,caramida_plina:.7,caramida_goala:1.5,bca:2,icf:3,lemn:2.5};
const lambda={eps:.040,xps:.035,vata_minerala:.037,interior:.040};
const uGlass={'pvc:dublu':1.4,'pvc:triplu':.9,'lemn:dublu':1.5,'lemn:triplu':1,'aluminiu_rpt:dublu':1.6,'aluminiu_rpt:triplu':1.1,'aluminiu:dublu':3,'aluminiu:triplu':2.2,'pvc:simplu':4.5,'lemn:simplu':2.8,'aluminiu:simplu':5};
const heating={pompa_caldura:92,centrala_condensatie:80,peleti:68,centrala_gaz:66,termoficare:52,electric:40,soba:32};
const dist={pardoseala:10,radiatoare:0,convectori:-5};
const controls={termostat_smart:8,termostat:5,robineti_termostatici:3,contorizare:3};
const classes={'A+':100,A:92,B:80,C:66,D:52,E:38,F:24,G:10};
const vents={hrv:95,mecanica:75,higroreglabila:70,naturala:50};
function compute(f){
 const notes=[], values={},confidence={};
 let rw=rWall[f.tip_perete]??null, ri=f.izolatie_tip==='fara'?0:lambda[f.izolatie_tip]&&f.izolatie_cm>0?f.izolatie_cm/100/lambda[f.izolatie_tip]*(f.izolatie_tip==='interior'?.75:1):null;
 let s=null,c=0,adjust=0;
 if(rw!=null&&ri!=null){s=clip((rw+ri)/4*100);c=1;}else if(rw!=null){s=clip(rw/4*100+15);c=.5;}else if(ri!=null){s=clip((1+ri)/4*100);c=.6;}
 if(f.pozitie==='ultim_etaj'&&f.acoperis_terasa_izolat!==true){adjust-=12;notes.push('Ultim etaj: izolarea terasei/acoperisului nu este confirmata.');}
 if(f.pozitie==='parter')adjust-=6;
 if(f.apartament_colt)adjust-=8;
 if(f.mucegai_semnalat){adjust-=15;notes.push('Mucegai sau condens semnalat; cauza trebuie verificata.');}
 if(f.orientare==='S')adjust+=3;else if(f.orientare==='N')adjust-=5;
 values.izolatie=[s,c,adjust];
 let u=uGlass[`${f.ferestre_material}:${f.ferestre_geam}`],fc=0,fa=0;
 if(u!=null)fc=.8;else if(f.ferestre_geam){u={simplu:4.5,dublu:1.8,triplu:1.1}[f.ferestre_geam];fc=.5;}
 if(u!=null){if(f.ferestre_low_e)u-=.3;if(f.ferestre_an){const age=new Date().getUTCFullYear()-f.ferestre_an;if(age>15){fa-=Math.min(15,age-15);notes.push(`Ferestre vechi (${age} ani): posibila uzura a garniturilor.`);}fc=Math.min(1,fc+.2);}if(f.procent_vitrat>25&&!f.protectie_solara)fa-=6;}
 values.ferestre=[u==null?null:clip((5-u)/4.2*100),fc,fa];
 s=heating[f.incalzire_tip]??null;c=0;
 if(s!=null){c=.6;if(f.distributie in dist){s+=dist[f.distributie];c+=.2;if(f.incalzire_tip==='pompa_caldura'&&f.distributie==='pardoseala')s+=5;if(f.incalzire_tip==='pompa_caldura'&&f.distributie==='radiatoare')s-=6;}if(Array.isArray(f.reglaj)&&f.reglaj.length){s+=Math.min(12,[...new Set(f.reglaj)].reduce((sum,x)=>sum+(controls[x]||0),0));c+=.2;}}
 values.incalzire=[s==null?null:clip(s),c,0];
 const ce=classes[String(f.clasa_energetica||'').toUpperCase()]??null, kwh=f.consum_kwh_mp_an==null?null:clip(100*(1-(f.consum_kwh_mp_an-40)/410));
 const ew=(ce!=null?.4:0)+(kwh!=null?.6:0);
 s=ew?((ce??0)*(ce!=null?.4:0)+(kwh??0)*(kwh!=null?.6:0))/ew:null;c=ew;
 if(ce!=null&&kwh!=null&&Math.abs(ce-kwh)>25){c*=.8;notes.push('Clasa energetica si consumul declarat sunt neconcordante.');}
 values.eficienta=[s,ew?Math.max(c,.4):0,f.fotovoltaic?6:0];
 s=vents[f.ventilatie_tip]??null;c=s==null?0:.7;adjust=0;let extra=0;
 for(const [flag,v] of [[f.hota_evacuare,6],[f.baie_cu_fereastra,5]])if(flag!=null){extra++;adjust+=flag?v:-v;}
 if(f.orientare==='traversant')adjust+=10;
 if(s==null&&(extra||f.orientare==='traversant')){s=50;c=.3;}
 values.ventilatie=[s,Math.min(1,c+.15*extra),adjust];
 for(const k of Object.keys(W)){
  let [raw,known,adj]=values[k];const p=prior(k,f.an_constructie);
  if(raw==null){raw=p;known=0;notes.push(`${k}: date lipsa; prior estimat din anul constructiei (${p}/100).`);}
  values[k]=clip(known*clip(raw+adj)+(1-known)*p);confidence[k]=known;
 }
 const sealed=['dublu','triplu'].includes(f.ferestre_geam)&&['pvc','aluminiu_rpt','lemn'].includes(f.ferestre_material)&&(f.ferestre_an||0)>=2008;
 if(sealed&&[null,'naturala'].includes(f.ventilatie_tip)&&f.pozitie!=='casa'){
  values.ventilatie=clip(values.ventilatie-12);notes.push('Ferestre etanse fara ventilatie controlata: penalizare euristica -12 la ventilatie.');
 }
 if(f.ventilatie_tip==='hrv'&&values.izolatie<40)notes.push('Recuperarea caldurii intr-o cladire slab izolata poate avea beneficii limitate.');
 if(values.incalzire>75&&values.izolatie<35){values.eficienta=clip(values.eficienta-8);notes.push('Incalzire performanta intr-o anvelopa slab izolata: -8 eficienta.');}
 const arithmetic=Object.keys(W).reduce((sum,k)=>sum+W[k]*values[k],0);
 const geometric=Math.exp(Object.keys(W).reduce((sum,k)=>sum+W[k]*Math.log(Math.max(1,values[k])),0));
 const total=.7*arithmetic+.3*geometric;
 const score=Math.round((1+9*total/100)*10)/10;
 const ic=Object.keys(W).reduce((sum,k)=>sum+W[k]*confidence[k],0);
 return {score,confidence:Math.round(ic*100)/100,subscores:Object.fromEntries(Object.keys(W).map(k=>[k,Math.round((1+9*values[k]/100)*10)/10])),rawScores:values,notes,arithmetic,geometric,estimated:ic<.4,class:score>=8.5?'Excelent':score>=6.5?'Bun':score>=4.5?'Mediu':score>=3?'Slab':'Foarte slab'};
}
export function evaluateThermalScreening({text='',facts={}}={}){const extracted=extractThermalFacts(text,facts);return {...compute(extracted),facts:extracted,method:'user-thermal-v3.8',limitations:'Scor de screening. Valorile lipsa sunt imputate din prior; nu reprezinta masuratori sau audit energetic.'};}

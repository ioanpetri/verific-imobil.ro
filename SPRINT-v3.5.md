# Verific Imobil v3.5 — motor investițional

Integrează metodologia furnizată de utilizator (octombrie 2026) în `app/lib/investment-v35.js` și o expune prin `POST /api/investment-score`.

## Cele patru scoruri
- RN: randament net din chirie (Y1 40%, Y2-Y5 câte 15%).
- PA: potențial de apreciere (G 35%, V 20%, D/O/C câte 15%).
- LR: lichiditate la revânzare (T 25%, Dp 20%, Tp/Dsc/Vz câte 15%, Bz 10%).
- PR: preț de intrare și riscuri (P 30%, T 10%, J 20%, S 15%, Dz/Z câte 10%, F 5%).

Scor compus cu media de putere p=0,5, strategii cashflow/balanced/growth/conservative, gates pentru risc seismic/juridic/natural, DSCR și lichiditate. Redistribuirea ponderilor se aplică indicatorilor de credit/dezvoltator neaplicabili.

## Contract API
POST `/api/investment-score` cu JSON `{ "strategy":"balanced", "financed":false, "newDevelopment":false, "data": { ... }, "verifiedRisks": { ... }, "evidence": [ ... ] }`.
Ratele procentuale în `data` se trimit ca fracții: 0.03 = 3%; valorile monetare sunt EUR. Inputurile necesare sunt documentate prin numele câmpurilor în `app/lib/investment-v35.js`.

Un indicator lipsă produce `null`, iar scorul său compus rămâne `null` până la completarea datelor. Nu se inventează chirii, fiscalitate, comparabile sau evaluări juridice. CASS și impozitul sunt parametri, nu cote garantate. Valorile fiscale trebuie verificate înainte de utilizare.

**Stadiu:** motor determinist + endpoint + teste; nu există încă integrare în formularul public sau flux automat de colectare a comparabilelor. Scorurile din interfața veche rămân neschimbate. Simularea Monte Carlo și calibrarea pe 100–200 de anunțuri sunt pași viitori, nu funcționalități pretinse.

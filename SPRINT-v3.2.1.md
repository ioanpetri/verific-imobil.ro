# Verific Imobil v3.2.1 — calibrare numerica din surse publice

## Integrat in cod
- Imobiliare.ro, septembrie 2026, Cluj-Napoca: 3316 EUR/mp toate apartamentele, 3500 noi, 3301 vechi, 91 zile perioada de vanzare.
- ANEVAR / Veridio, tranzactii istorice Cluj-Napoca: 1362 EUR/mp in 2019 si 1477 EUR/mp in 2020.
- Castela, judetul Cluj, septembrie 2026: 2708 EUR/mp pret median cerut; 10 EUR/mp/luna chirie mediana ceruta. Volum ANCPI 2257 tranzactii judetene aprilie 2026.
- Market360, T3 2024 Cluj-Napoca: 61 zile perioada medie de vanzare, 3,9% marja de negociere.

## Comportament
- Datele sunt transmise AI cu etichete de sursa, perioada, geografie si tip de indicator.
- API include marketCalibration cu pret/mp extras, abatere fata de media ceruta a orasului, scenariu de chirie judetean si randament brut ipotetic, NUMAI daca textul contine o singura valoare de pret recunoscuta si o suprafata explicita.
- Datele agregate NU schimba automat scorul calitate-pret, investitie sau locuire. Lipsesc comparabile de microzona, chirii comparabile, costuri si preturi recente de tranzactionare. Scorurile financiare necunoscute raman neutre.
- Scenariul de chirie nu este un randament net verificat; abaterea fata de media orasului nu este o evaluare individuala.
- Evaluarile utilizatorului A/B/C sunt pastrate.

## Surse
- https://www.imobiliare.ro/indicele-imobiliare-ro/cluj-napoca
- https://www.anevar.ro/images/_upload/ghid-tranzactii-cluj-napoca-2020.pdf
- https://www.anevar.ro/images/_upload/ghid-tranzactii-cluj-napoca-2019-compressed.pdf
- https://castela.ro/statistici/cluj
- https://castela.ro/statistici/date (licenta: atribuire Castela.ro)
- https://market360.imobiliare.ro/wp-content/uploads/2024/11/Raport-T3_2024-WEB-copy.pdf

## Testare
- node tests/hybrid-engine.test.mjs
- node tests/market-calibration.test.mjs
- node --check app/api/analyze/route.js
- Build Next.js si deploy Vercel neefectuate.

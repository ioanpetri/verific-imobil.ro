# v3.3.0 — grile explicabile, prudenta si trasabilitate

## Modificari efective
- Modul nou `app/lib/scoring-v33.js`: reguli deterministe pentru compartimentare, finisaje, expunere feroviara explicit mentionata si parter. Reguli interne experimentale, **nu coeficienti ANEVAR**.
- `rubricChanges` in API: fiecare ajustare cu scor anterior/nou, justificare si regula.
- `reliability` in API: nivel de incredere pe fiecare criteriu, limitari financiare.
- `rentalScenario` in API: randament brut si randament net **ilustrativ** cu ipoteze explicite, nu scor investitional verificat. Chiria 10 EUR/mp/luna este mediana judeteana Castela existenta in v3.2.1.
- Scorurile de locuire se modifica numai daca anuntul contine dovezi explicite corespunzatoare regulilor. Scorurile de pret si investitie raman prudente/neutre fara comparabile individuale verificate.
- Teste pentru reguli, negatii, randament si referintele A/B/C.

## Limitari ramase / faza v3.4
- Nu exista colectare automata autorizata de comparabile individuale, tranzactii actuale sau CSV Castela live.
- Nu au fost calibrati coeficienti statistici pe 50 de evaluari umane; sunt doar 3 cazuri de referinta.
- Nu exista validare pe preturi de tranzactie; nu prezentam o medie oras drept evaluare individuala.
- Nu sunt importate grile ANEVAR protejate sau date comerciale Market360 fara drepturi.

## Testare
`node tests/scoring-v33.test.mjs` si `node tests/hybrid-engine.test.mjs`.

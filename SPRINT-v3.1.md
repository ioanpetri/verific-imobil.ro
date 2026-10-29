# Verific Imobil v3.1 — motor hibrid, prima etapa

## Implementat
- AI extrage si interpreteaza datele anuntului; serverul calculeaza scorurile din subcriterii.
- Reguli deterministe pentru semidecomandare, parter si finisaje/defecte mentionate explicit.
- Grilele si ponderile anterioare sunt pastrate.
- 3 evaluari umane A/B/C ca referinte de calibrare in `app/lib/hybrid-engine.js`.
- Guardrails financiare: randamentul net, aprecierea, pretul de intrare si raportul pret/comparabile sunt neutre (5/10) fara comparabile sau date financiare verificate. Scorul de lichiditate ramane estimativ.
- Raspunsul API include `engine` cu versiunea si modificarile aplicate.
- Teste locale: `node tests/hybrid-engine.test.mjs`.

## Limite explicite
- Nu este un model ML antrenat pe tranzactii; sunt numai 3 evaluari umane, insuficiente pentru training si validare independenta.
- Nu exista API live de comparabile autorizat. Indicele Imobiliare.ro folosit anterior este reper agregat, nu tranzactie individuala.
- Nu se face scraping masiv, nu se garanteaza actualitatea indicelui static.
- Nu exista invatare online automata intre cereri; aceasta necesita colectare de feedback cu consimtamant, stocare, set de validare si procedura de retraining.

## Pasii urmatori
1. Contract/API de date pentru oferte si tranzactii; sursa, data, drepturi de utilizare.
2. Inregistrarea opt-in a evaluarilor umane si a rezultatelor reale.
3. Minimum 50 cazuri etichetate pentru testare initiala; apoi sute pentru un model ML validat.
4. Validare out-of-sample, eroare medie, bias pe cartier si intervale de incertitudine.

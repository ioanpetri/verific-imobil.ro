# v3.2 — Surse publice verificabile (integrare initiala)

- Snapshot Imobiliare.ro iulie 2026: 3306 €/mp toate, 3485 €/mp noi, 3292 €/mp vechi. URL, perioada, tipul datelor si data verificarii incluse in `app/data/market-cluj.json`.
- API-ul transmite reperele catre AI si intoarce `marketEvidence` pentru trasabilitate.
- ANEVAR, Market360, Castela, ANCPI, INSSE, ValorEasy si Imo360 sunt in registrul de surse, dar **nu sunt integrate numeric**.
- Nu se modifica scorurile financiare fara comparabile verificabile; componentele raman neutre cand lipsesc dovezile.
- Graficul de pret nu mai inventeaza istoric si prognoze din puncte neconfirmate; pastreaza doar reperul indexat.
- Nu exista scraping automat, API autorizat, invatare autonoma sau antrenare statistica.
- Pentru v3.3: import de tabele PDF/CSV cu licente verificate, normalizare microzone, seturi de comparabile si evaluare out-of-sample.

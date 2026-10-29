# Verific Imobil v3.6 - Screening structural

Implementat motorul determinist `app/lib/structural-v36.js`, pe baza algoritmului furnizat de utilizator: A 25%, B 30%, C 20%, D 25%; agregare geometrica, veto V1-V7, incredere si interval scenarii.

Endpointul `app/api/analyze/route.js` include `structuralScreening` in JSON si actualizeaza criteriul structural doar daca scorul poate fi calculat si increderea este cel putin 0.40. Scorurile afisate in UI pot ramane cele vechi cand dovezile lipsesc. Nu este expertiza tehnica.

Limitari: nu se extrag automat informatii din fotografii si documente; evaluarea este bazata pe textul anuntului. Scenariile de incertitudine sunt euristice. Scorul documentatiei reflecta dovezile mentionate, nu starea structurala reala. Nu exista validare pe 100 de cladiri expertizate. Pentru siguranta, sistemul nu deduce un tip structural din simplul an al constructiei.

## Teste
`node tests/structural-v36.mjs`

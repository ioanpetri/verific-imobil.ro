# Verific Imobil v3.4 — algoritm incarcat (etapa 1)

Sursa: documentul furnizat de utilizator, «Algoritm de evaluare a unui apartament în Cluj-Napoca», octombrie 2026.

## Implementat
- Configuratie versionata cu ponderile celor 4 scoruri, profiluri si reguli eliminatorii.
- Functii deterministe: Lin, medie ponderata fara imputarea datelor absente, medie de putere p=0.5, randament net, IRR, normalizarea indicatorilor investitionali, plafonari, provenienta si coeficient de incredere.
- Motorul este importat in API si intoarce `algorithmV34` cu stare incompleta cand lipsesc indicatori verificati.
- Teste automate: `node tests/algorithm-v34.mjs`.

## Neimplementat inca / nu se afirma ca este activ
- Cele 4 scoruri afisate in UI continua sa provina din motorul v3.3. Nu au fost inlocuite cu scoruri fictive.
- Conectarea automata a surselor externe, geocodarea, 8-15 comparabile, evaluarea juridica si financiara, scenariile pe 10 ani si Monte Carlo nu sunt disponibile inca.
- Datele insuficiente nu permit un scor complet v3.4; raspunsul `algorithmV34.scores` contine null.
- Nu se reintroduce sectiunea tehnica de calibrare in interfata.

## Urmatoarea etapa
Conectarea datelor verificabile la noul motor si migrarea UI doar cand cele patru scoruri sunt calculabile si auditate.

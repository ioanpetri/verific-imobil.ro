# Verific Imobil v3.9 - Confort acustic

Algoritmul utilizatorului pentru confort acustic este portat in `app/lib/acoustic-v39.js`.

- Izolare intre apartamente 30%, zgomot exterior 25%, pozitie 20%, ferestre 25%.
- Profile: standard, somn_sensibil, home_office, familie_copii.
- Casa: izolarea intre apartamente este neaplicabila, ponderile ramase sunt renormalizate.
- Model: estimari Rw/Ln,w, Lden, suma energetica a surselor, ferestre si nivel interior nocturn; prior pe an si structura, contractie la date lipsa.
- Agregare: 65% aritmetica + 35% geometrica; veto peste 42 dB interior nocturn estimat -> max 5.5/10.
- Integrare in `app/api/analyze/route.js`: `acousticScreening` in JSON; inlocuire scor acustic AI doar la incredere >=0.40.
- Nu se interpreteaza automat poze sau planuri; informatiile sunt extrase conservator din text.
- Estimarile dB NU sunt masuratori si nu demonstreaza conformitate cu normativul C125 / SR EN ISO 717.
- Nu s-a rulat un build complet Next.js; testele unitare au trecut.
- Codul sursa Python a fost portat in JavaScript, nu rulat ca Python in productie.

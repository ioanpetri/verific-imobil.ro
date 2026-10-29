# Verific Imobil v3.8 — Confort termic

Motor determinist `app/lib/thermal-v38.js`, portat dupa algoritmul Python furnizat de utilizator.

- Izolatie 30%, ferestre 20%, incalzire 20%, eficienta 20%, ventilatie 10%.
- Prior-uri pe perioada constructiei, contractie dupa acoperirea datelor.
- Interactiuni intre ferestre/ventilatie si incalzire/izolatie.
- Agregare 70% aritmetica + 30% geometrica, mapare 0-100 la 1-10.
- API `POST /api/analyze` include `thermalScreening`; inlocuieste scorul `criteria.thermal` numai la IC >= 0.40.
- Nu sunt implementate vetouri sau intervale de incertitudine: nu existau in codul original.
- Valorile R/U si prior-urile sunt euristici, nu masuratori. Nu se interpreteaza automat poze sau certificate.
- `facts` permite evaluare structurata; textul este extras conservator.
- Test: `node --experimental-default-type=module tests/thermal-v38.mjs`.

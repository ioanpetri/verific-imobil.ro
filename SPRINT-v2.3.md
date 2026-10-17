# Sprint v2.3 — Grafice conectate la API

## Mesaj commit
`feat(ui): add API-connected property evaluation charts (sprint v2.3)`

## Modificări
- `app/components/PropertyCharts.jsx` (nou): componente reale `CriteriaBarChart`, `CoverageDonut`, `EvidenceDonut`.
- `app/page.jsx`: importă componentele, le alimentează din răspunsul `POST /api/analyze`, actualizează textele și eticheta versiunii.
- `package.json`: versiune 2.3.0.
- `README.md`: instrucțiuni de publicare și contract API.

## Contract API
- `result.criteria`: obiect cu cheile structural, layout, thermal, acoustic, visual, materials, liveability, neighbourhood; fiecare criteriu poate avea `score` (0–10 sau null), `reason`, `evidence` (declared/inferred/unknown).
- `result.coverage`: procent 0–100, furnizat de API.
- `result.quality`, `result.investment.score`: scoruri 0–10 sau null.

## Atenție
- Pie/donut-ul de proveniență numără criteriile, nu ponderile.
- UI nu deduce acoperirea din simpla existență a scorului.
- Backend-ul de imputare pentru date lipsă este un sprint separat; aici nu a fost modificat.
- Codul sursă este bazat pe exportul reconstruit v2.2, nu pe un checkout confirmat al repo-ului GitHub.

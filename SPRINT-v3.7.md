# Verific Imobil v3.7 - Compartimentare si functionalitate

Motor determinist `app/lib/layout-v37.js` dupa algoritmul furnizat de utilizator.

- A (suprafata/camere) 30%, B (compartimentare) 30%, C (bai) 20%, D (bucatarie/depozitare) 20%.
- Regula punctului slab, veto V1-V5, interval de incertitudine si indice de incredere.
- Extrage doar date declarate explicit in text sau transmise structurat in `facts`.
- API `POST /api/analyze` returneaza `layoutScreening`; scorul vizibil se actualizeaza numai daca IC >= 0.40.
- `planVerified` poate creste increderea, fara bonus automat la scor.
- Fotografiile si planurile nu sunt interpretate automat in aceasta versiune.
- Fara dimensiuni reale ale camerelor, se foloseste regula A2=A1-1, cu incredere redusa.
- Datele lipsa sunt tratate prin scenarii; scorurile partiale nu reprezinta masuratori.

## Teste

`node tests/layout-v37.mjs` si celelalte teste din `tests/`.

## Limitari

Scorul 1-10 este un indicator functional orientativ. Extragerile de tip `bai` si `bucatarie` sunt conservative; informatiile prezente numai in imagini nu sunt procesate. Fara releveu, dimensiunile sunt aproximative.

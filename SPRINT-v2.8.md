# Sprint v2.8 — Scor investitie si acoperire

- Scorul de investitie ramane numeric 1–10; daca datele economice nu permit o evaluare, fallback explicit la 5/10 (estimare neutra), fara inventarea chiriilor sau randamentelor.
- Promptul AI cere o estimare prudenta folosind datele disponibile, cu explicarea limitarilor.
- Acoperirea nu mai afiseaza 0% in cazul in care niciun criteriu nu are provenienta pozitiva clasificata: se afiseaza «Nedeterminata». Procentul pozitiv ramane calculat din ponderile criteriilor cu provenienta documented/declared/inferred.
- Interfata v2.7, subcriteriile expandabile si Analiza avansata sunt pastrate.

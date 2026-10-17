# Verific Imobil v2.1

Next.js property-listing analysis app using OpenAI `gpt-4o-mini`.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and add your own OpenAI API key.
3. `npm run dev`
4. Open http://localhost:3000

## Deploy

Push the project files to GitHub, connect the repository to Vercel, and set `OPENAI_API_KEY` as a **Production** environment variable. Do not commit your actual API key.

## Important limitations

The report is indicative, not a technical inspection, legal verification or independent market valuation. Some listing sites block automated fetching; use manual description instead.

## Export note

This package is a **reconstructed v2.1 source export** based on the application design, not a byte-for-byte retrieval of the Vercel deployment. Vercel source-file retrieval was blocked by a permissions error.


## Interfata v2.2

Include bar chart pentru scorurile celor opt criterii, donut chart pentru acoperirea datelor si distributia tipurilor de dovezi. Graficele sunt implementate in React/CSS fara dependinte suplimentare. Backend-ul de evaluare este cel din v2.1; algoritmul Python de imputare pentru date lipsa nu este integrat in aceasta versiune.


## Sprint v2.3 — grafice React conectate la API

`app/components/PropertyCharts.jsx` conține cele trei componente vizuale. `app/page.jsx` le alimentează din răspunsul `POST /api/analyze`. Bar chart-ul afișează cele opt scoruri; donut-urile afișează acoperirea API și proveniența datelor. Niciun grafic nu inventează scoruri lipsă.

### Publicare în GitHub

1. Extrage ZIP-ul și copiază **conținutul** folderului `verific-imobil-export` în rădăcina unui checkout local al `https://github.com/ioanpetri/verific-imobil.ro`.
2. Verifică diferențele cu `git status` și `git diff`. Nu suprascrie fișierele existente fără revizuire.
3. Rulează `npm install` și `npm run build`.
4. Rulează `git add app/page.jsx app/components/PropertyCharts.jsx package.json README.md SPRINT-v2.3.md`.
5. Rulează `git commit -m "feat(ui): add API-connected property evaluation charts (sprint v2.3)"`.
6. Rulează `git push origin main` (sau ramura principală reală a repository-ului).

Nu adăuga `.env.local` sau cheia `OPENAI_API_KEY` în Git.

# Lyttejeger

Distraksjonsfri podcast-app for å finne det du vil høre. Bygget med React 19, TypeScript og Podcast Index API.

**Live app**: https://elzacka.github.io/lyttejeger/

## Funksjoner

- **Søk** - Hybrid søk med tittel + term matching, søkeoperatorer (`AND`, `OR`, `"frase"`, `-ekskluder`)
- **Filtre** - Språk, kategori, årstall, oppdagelsesmodus (indie, value4value)
- **Oppdagelse** - Kuraterte anbefalinger og tilfeldige episoder på forsiden
- **Avspiller** - Hastighet, søvntimer, kapitler, transkripsjoner, Bluetooth/bilstereo-støtte
- **Bibliotek** - Abonnementer, spillekø, nyeste episoder
- **PWA** - Installerbar, offline-støtte, responsivt design

## Kom i gang

```bash
npm install

# Opprett .env.local med API-nøkler fra podcastindex.org
echo 'VITE_PODCASTINDEX_API_KEY=din_key' >> .env.local
echo 'VITE_PODCASTINDEX_API_SECRET=din_secret' >> .env.local

npm run dev     # Start på localhost:5175
npm run build   # Bygg for produksjon
```

## Teknologi

React 19 | TypeScript | Vite | Podcast Index API | Dexie (IndexedDB) | PWA/Workbox

## Personvern og sikkerhet

- Ingen sporing eller analytics
- Alle ressurser selvhostet (ingen Google Fonts/CDN)
- Data lagres lokalt i nettleseren
- CSP-headers for XSS-beskyttelse

## Lisens

MIT

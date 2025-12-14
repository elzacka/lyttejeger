# Lyttejeger - Podcast-app

En distraksjonsfri og uavhengig podcast-app med smart-funksjon og filtre: Gjør det lettere å finne podcaster du vil høre på. Bygget som en PWA (Progressive Web App) med React 19 og Vite.

## Funksjoner

- **Podcast Index API**: Sanntidssøk i verdens største åpne podcast-database
- **Søkeoperatorer**: Støtte for `AND` (standard), `OR`, `"eksakt frase"` og `-ekskluder`
- **Episode-søk**: Søk direkte i episoder for å finne innhold som matcher alle søkeord
- **Fleksible filtre**: Filtrer på språk, kategori og periode
- **Avspiller**: Fullverdig audiospiller med hastighetsregulering, søvntimer og Media Session API
- **Abonnementer**: Følg podkaster og se nyeste episoder fra siste 7 dager
- **Spillekø**: Legg til episoder i kø med drag-and-drop rekkefølge
- **PWA**: Installerbar på mobil og desktop med offline-støtte
- **Responsivt design**: Fluid typography og touch-vennlig på alle skjermstørrelser
- **Tilgjengelighet**: Skip-link, aria-live regioner og redusert bevegelse-støtte

## Teknologi

- React 19.2
- TypeScript
- Vite 7
- Podcast Index API
- Dexie (IndexedDB)
- PWA med Workbox
- CSS Modules med custom properties

## Kom i gang

```bash
# Installer avhengigheter
npm install

# Konfigurer API-nøkler (opprett .env.local)
VITE_PODCASTINDEX_API_KEY=din_api_nøkkel
VITE_PODCASTINDEX_API_SECRET=din_api_secret

# Start utviklingsserver
npm run dev

# Bygg for produksjon
npm run build

# Forhåndsvis produksjonsbuild
npm run preview
```

## Prosjektstruktur

```
src/
├── components/     # React-komponenter med CSS Modules
│   ├── AudioPlayer.tsx       # Avspiller med Media Session
│   ├── BottomNav.tsx         # Bunnnavigasjon
│   ├── HomeView.tsx          # Nyeste episoder fra abonnementer
│   ├── PodcastDetailView.tsx # Podcast-detaljer og episodeliste
│   ├── SearchView.tsx        # Søk og filtrering
│   └── ...
├── hooks/          # Custom React hooks
│   ├── useSearch.ts          # Søkelogikk og API-kall
│   ├── useQueue.ts           # Spillekø-håndtering
│   └── useSubscriptions.ts   # Abonnement-håndtering
├── services/       # API-klienter og database
│   ├── podcastIndex.ts       # Podcast Index API
│   └── db.ts                 # Dexie IndexedDB
├── tokens/         # Design tokens (CSS variables)
├── types/          # TypeScript-typer
├── utils/          # Hjelpefunksjoner
├── App.tsx         # Hovedkomponent
└── main.tsx        # Entry point
```

## Søkefunksjoner

Søkemotoren inkluderer:

- **API-basert søk**: Direkte søk mot Podcast Index API
- **Søkeoperatorer**:
  - `ord1 ord2` - Finner resultater med begge ord (AND)
  - `ord1 OR ord2` - Finner resultater med minst ett ord
  - `"eksakt frase"` - Finner nøyaktig match
  - `-ord` - Ekskluderer resultater med ordet
- **Lokal filtrering** av API-resultater
- **Støtte for norske tegn** (æ, ø, å)

## Tilgjengelighet

- Skip-link for tastaturnavigasjon
- `aria-live` regioner for dynamisk innhold
- Minimum 44px touch-targets
- Respekterer `prefers-reduced-motion`
- Semantiske HTML-elementer og ARIA-roller
- Media Session API for systemmediekontroller

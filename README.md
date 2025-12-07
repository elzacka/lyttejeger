# Lyttejeger - Podcast App

En distraksjonsfri og uavhengig podcast app med smart søkefunksjon og filtre: Gjør det lettere å finne podcaster du vil høre på. Bygget som en  PWA (Progressive Web App) med React 19.2 og Vite.

## Funksjoner

- **Avansert fuzzy-søk**: Søk med Fuse.js for intelligent matching med skrivefeiltoleranse
- **Søkeoperatorer**: Støtte for `AND` (standard), `OR`, `"eksakt frase"` og `-ekskluder`
- **Episode-søk**: Søk direkte i episoder for å finne innhold som matcher alle søkeord
- **Fleksible filtre**: Filtrer på kategori, språk, vurdering og eksplisitt innhold
- **Sortering**: Sorter etter relevans, vurdering, nyeste eller mest populære
- **PWA**: Installerbar på mobil og desktop med offline-støtte
- **Responsivt design**: Fluid typography og touch-vennlig på alle skjermstørrelser
- **Tilgjengelighet**: Skip-link, aria-live regioner og redusert bevegelse-støtte
- **Mørk/lys modus**: Automatisk basert på systeminnstillinger

## Teknologi

- React 19.2.1
- TypeScript
- Vite 7
- Fuse.js (fuzzy search)
- PWA med Workbox
- CSS Modules med custom properties

## Kom i gang

```bash
# Installer avhengigheter
npm install

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
├── hooks/          # Custom React hooks (useSearch)
├── types/          # TypeScript-typer
├── utils/          # Søkemotor og hjelpefunksjoner
├── data/           # Mock-data for podcaster og episoder
├── App.tsx         # Hovedkomponent
└── main.tsx        # Entry point
```

## Søkefunksjoner

Søkemotoren inkluderer:

- **Fuzzy matching**: Fuse.js med skrivefeiltoleranse (threshold: 0.3)
- **Søkeoperatorer**:
  - `ord1 ord2` - Finner resultater med begge ord (AND)
  - `ord1 OR ord2` - Finner resultater med minst ett ord
  - `"eksakt frase"` - Finner nøyaktig match
  - `-ord` - Ekskluderer resultater med ordet
- **Tokenisering og normalisering** av tekst
- **Støtte for norske tegn** (æ, ø, å)
- **Relevansscoring** basert på tittel, forfatter, kategori og beskrivelse

## Tilgjengelighet

- Skip-link for tastaturnavigasjon
- `aria-live` regioner for dynamisk innhold
- Minimum 44px touch-targets
- Respekterer `prefers-reduced-motion`
- Semantiske HTML-elementer og ARIA-roller

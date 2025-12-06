# Lyttejeger - Podcast Discovery App

En moderne PWA (Progressive Web App) for å oppdage og søke etter podcaster. Bygget med React 19 og Vite.

## Funksjoner

- **Avansert søk**: Søk etter podcaster med intelligent relevansrangering
- **Fleksible filtre**: Filtrer på kategori, språk, vurdering og eksplisitt innhold
- **Sortering**: Sorter etter relevans, vurdering, nyeste eller mest populære
- **PWA**: Installerbar på mobil og desktop med offline-støtte
- **Responsivt design**: Fungerer på alle skjermstørrelser
- **Mørk/lys modus**: Automatisk basert på systeminnstillinger

## Teknologi

- React 19.1
- TypeScript
- Vite 7
- PWA med Workbox
- CSS Modules

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
├── components/     # React-komponenter
├── hooks/          # Custom React hooks
├── types/          # TypeScript-typer
├── utils/          # Hjelpefunksjoner
├── data/           # Mock-data
├── App.tsx         # Hovedkomponent
└── main.tsx        # Entry point
```

## Søkefunksjoner

Søkemotoren inkluderer:
- Tokenisering og normalisering av tekst
- Støtte for norske tegn (æ, ø, å)
- Relevansscoring basert på tittel, forfatter, kategori og beskrivelse
- Boost for høy rating og nylig oppdaterte podcaster

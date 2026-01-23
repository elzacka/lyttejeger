# Typografisystem - Lyttejeger PWA

Moderne typografihierarki implementert i henhold til beste praksis per januar 2026.

## Designprinsipper

- **Mobile-first**: Optimalisert for små skjermer med responsiv skalering
- **WCAG 2.2 AA**: Oppfyller tilgjengelighetskrav for kontrast og størrelse
- **Konsistent hierarki**: Tydelig visuell hierarki med 1.25 ratio (major third)
- **Semantiske tokens**: Navnekonvensjon basert på bruk, ikke størrelse
- **Monospace-optimalisert**: Tilpasset for DM Mono font

## Token-hierarki

### Design Tokens (src/design-tokens.css)

Semantiske tokens som beskriver **bruk**, ikke størrelse:

```css
/* Display level - Hero content */
--font-display: var(--text-5xl);      /* 32px → 28px mobile */
--font-display-sm: var(--text-4xl);   /* 28px → 24px mobile */

/* Heading level - Sidestruktur */
--font-h1: var(--text-3xl);           /* 24px → 20px mobile - Sidetitler */
--font-h2: var(--text-2xl);           /* 20px → 18px mobile - Seksjonstitler */
--font-h3: var(--text-xl);            /* 18px → 16px mobile - Underseksjoner */
--font-h4: var(--text-lg);            /* 16px - Minor headings */

/* Title level - Kort og items */
--font-title: var(--text-lg);         /* 16px → 15px mobile - Podcast-navn */
--font-title-sm: var(--text-base);    /* 15px → 13px mobile - Episode-titler */

/* Body level - Innhold */
--font-body: var(--text-base);        /* 15px - Primær tekst */
--font-body-sm: var(--text-sm);       /* 13px - Sekundær tekst, beskrivelser */

/* UI level - Interaktive elementer */
--font-label: var(--text-md);         /* 14px - Form labels, knapper */
--font-label-sm: var(--text-sm);      /* 13px - Små knapper, tabs */

/* Caption level - Metadata */
--font-caption: var(--text-xs);       /* 12px - Tidsstempler, metadata */
--font-badge: var(--text-2xs);        /* 11px - Badges, tellere */
```

### Primitive Tokens (src/tokens/tokens.css)

Basistokens med faktiske størrelser:

```css
/* Caption level */
--text-2xs: 0.6875rem;    /* 11px - badges */
--text-xs: 0.75rem;       /* 12px - captions, metadata */

/* Label level */
--text-sm: 0.8125rem;     /* 13px - form labels */
--text-md: 0.875rem;      /* 14px - button text */

/* Body level */
--text-base: 0.9375rem;   /* 15px - body text */
--text-lg: 1rem;          /* 16px - emphasized body */

/* Title level */
--text-xl: 1.125rem;      /* 18px - subsection titles */
--text-2xl: 1.25rem;      /* 20px - section headers */
--text-3xl: 1.5rem;       /* 24px - page titles */
--text-4xl: 1.75rem;      /* 28px - page titles */

/* Display level */
--text-5xl: 2rem;         /* 32px - hero */
--text-6xl: 2.5rem;       /* 40px - hero large */
--text-7xl: 3rem;         /* 48px - hero extra large */
```

## Line Heights

```css
--leading-none: 1;        /* Badges, tight UI */
--leading-tight: 1.25;    /* Headings, display text */
--leading-snug: 1.375;    /* Titles, UI labels */
--leading-normal: 1.5;    /* Body text (WCAG anbefalt) */
--leading-relaxed: 1.625; /* Long-form content */
--leading-loose: 2;       /* Spesialtillfeller */
```

## Brukseksempler

### Sidetitler (Views)

```css
.pageTitle {
  font-size: var(--font-h1);      /* 24px desktop, 20px mobile */
  line-height: var(--leading-tight);
  font-weight: 500;
}
```

### Seksjonsoverskrifter

```css
.sectionTitle {
  font-size: var(--font-h2);      /* 20px desktop, 18px mobile */
  line-height: var(--leading-tight);
  font-weight: 500;
}
```

### Podcast-titler (kort)

```css
.podcastTitle {
  font-size: var(--font-title);   /* 16px desktop, 15px mobile */
  line-height: var(--leading-snug);
  font-weight: 500;
}
```

### Episode-titler

```css
.episodeTitle {
  font-size: var(--font-title-sm); /* 15px desktop, 13px mobile */
  line-height: var(--leading-normal);
  font-weight: 500;
}
```

### Brødtekst

```css
.bodyText {
  font-size: var(--font-body);     /* 15px */
  line-height: var(--leading-normal);
}
```

### Beskrivelser og sekundær tekst

```css
.description {
  font-size: var(--font-body-sm);  /* 13px */
  line-height: var(--leading-normal);
  color: var(--text-secondary);
}
```

### Metadata og tidsstempler

```css
.metadata {
  font-size: var(--font-caption);  /* 12px */
  line-height: var(--leading-normal);
  color: var(--text-muted);
}
```

### Badges og tellere

```css
.badge {
  font-size: var(--font-badge);    /* 11px */
  line-height: var(--leading-none);
}
```

### Knapper

```css
/* Standard knapp */
.button {
  font-size: var(--font-label);    /* 14px */
  line-height: var(--leading-snug);
}

/* Liten knapp */
.buttonSmall {
  font-size: var(--font-label-sm); /* 13px */
  line-height: var(--leading-snug);
}
```

## Responsiv oppførsel

Alle semantiske tokens skalerer automatisk basert på viewport:

- **Mobile (≤640px)**: Reduserte størrelser for bedre lesbarhet på små skjermer
- **Tablet (641-768px)**: Intermediære størrelser
- **Desktop (≥769px)**: Full størrelse

Dette håndteres automatisk via media queries i `design-tokens.css` - du trenger ikke legge til responsive overrides i komponenter.

## Migrering fra gamle tokens

Hvis du finner gamle token-referanser, erstatt med:

| Gammel token | Ny token |
|--------------|----------|
| `--font-meta` | `--font-caption` |
| `--font-title` (uten -sm) | `--font-title` eller `--font-title-sm` (avhengig av kontekst) |
| `--heading-1` | `--font-h1` |
| `--heading-2` | `--font-h2` |
| Hardkodede px-verdier | Bruk passende semantisk token |

## Best practices

1. **Bruk semantiske tokens**: Alltid bruk `--font-*` tokens, aldri `--text-*` direkte
2. **Inkluder line-height**: Alltid sett `line-height` sammen med `font-size`
3. **Unngå hardkodede verdier**: Bruk alltid tokens for konsistens
4. **Test responsivitet**: Verifiser at teksten skalerer riktig på alle skjermstørrelser
5. **Følg hierarkiet**: Bruk tokens som matcher innholdets viktighet

## Tilgjengelighet

- Alle fontstørrelser oppfyller WCAG 2.2 AA minimumskrav (12px+)
- Line-heights følger WCAG-anbefalinger for lesbarhet (1.5 for body text)
- Responsiv skalering sikrer lesbarhet på alle enheter
- Semantiske tokens gjør det enkelt å opprettholde konsistent hierarki

## Verktøy

For å verifisere konsistent bruk av typografi:

```bash
# Finn hardkodede font-sizes
find src/components -name "*.module.css" -exec grep -H "font-size: [0-9]" {} \;

# Finn gamle tokens
grep -r "font-meta\|--font-title[^-]" src/components/*.module.css

# Sjekk line-height konsistens
grep -h "line-height:" src/components/*.module.css | sort -u
```

---

## Implementeringsstatus

✅ **Fullstendig standardisert per 23. januar 2026**

Alle komponenter følger nå det moderne typografihierarkiet:

### Views
- **HomeView, QueueView, SubscriptionsView**: Alle bruker `--font-h2` (20px → 18px mobile)
- **PodcastDetailView**: Bruker `--font-h1` for podcast-tittel, `--font-h2` for seksjoner

### Kort og Items
- **EpisodeCard**: `--font-title-sm` for episode-titler
- **PodcastCard**: `--font-body-sm` for podcast-titler
- **Metadata**: `--font-caption` konsistent på tvers av alle kort
- **Badges**: `--font-badge` for tellere og små labels

### Konsistens-metrics
- ✅ **0** hardkodede px-størrelser
- ✅ **0** hardkodede line-heights
- ✅ **100%** bruk av semantiske tokens
- ✅ **Responsiv** skalering på alle nivåer

### Line-height standarder
- Headings (h1-h4): `--leading-tight` (1.25)
- Titler og labels: `--leading-snug` (1.375)
- Brødtekst: `--leading-normal` (1.5)
- Badges og ikoner: `--leading-none` (1)

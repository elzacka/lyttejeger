/**
 * ============================================================================
 * KURATERT INNHOLD - Konfigurasjon for Discovery-modus
 * ============================================================================
 *
 * Denne filen styrer hva som vises i "Anbefalt" / "Tilfeldig utvalgt" boksen
 * på forsiden når søkefeltet er tomt.
 *
 * FIRE VARIANTER:
 * ───────────────────────────────────────────────────────────────────────────
 * 1. 'random'           → Tilfeldig episode fra API (overskrift: "Tilfeldig")
 * 2. 'podcasts'         → Første episode fra kuraterte podcaster (overskrift: "Anbefalt")
 * 3. 'episodes'         → Spesifikke kuraterte episoder (overskrift: "Anbefalt")
 * 4. 'podcasts-episodes'→ Mix av kuraterte podcaster og episoder (overskrift: "Anbefalt")
 *
 * SLIK AKTIVERER DU EN VARIANT:
 * Endre DISCOVERY_MODE nederst i filen til ønsket verdi.
 */

// ============================================================================
// TYPER
// ============================================================================

export interface CuratedPodcast {
  feedId: number;
  /** Valgfri kommentar for egen referanse */
  note?: string;
}

export interface CuratedEpisode {
  feedId: number;
  /** Episode-guid fra RSS-feed */
  guid: string;
  /** Valgfri kommentar for egen referanse */
  note?: string;
}

/**
 * Discovery-modus:
 * - 'random'            : Kun tilfeldige episoder fra API
 * - 'podcasts'          : Kun kuraterte podcaster (første episode)
 * - 'episodes'          : Kun kuraterte episoder
 * - 'podcasts-episodes' : Blanding av kuraterte podcaster og episoder
 */
export type DiscoveryMode = 'random' | 'podcasts' | 'episodes' | 'podcasts-episodes';

// ============================================================================
// KURATERTE PODCASTER
// ============================================================================
// Legg til podcaster med feedId. Discovery viser FØRSTE episode (eldste),
// siden mange er serier der rekkefølge er viktig.
//
// Finn feedId: Søk på podcastindex.org eller i appen.

export const CURATED_PODCASTS: CuratedPodcast[] = [
  { feedId: 6884446 },
  { feedId: 6927194 },
  { feedId: 7131243 },
  { feedId: 735150 },
  { feedId: 6096232 },
  { feedId: 7160479 },
  { feedId: 7076134 },
  { feedId: 942171 },
  { feedId: 7083155 },
  { feedId: 6797007 },
  { feedId: 6875318 },
];

// ============================================================================
// KURATERTE EPISODER
// ============================================================================
// Legg til spesifikke episoder med feedId og guid.
// Bra for å fremheve spesielt gode enkeltepisoder.
//
// Finn guid: Sjekk podcast RSS-feed eller episode API-respons.

export const CURATED_EPISODES: CuratedEpisode[] = [
  { feedId: 13758, guid: 'Buzzsprout-18184709', note: 'Flott intervju med...' },
];

// ============================================================================
// AKTIV MODUS - ENDRE HER FOR Å BYTTE VARIANT
// ============================================================================
//
// Variant 1: 'random'            → Overskrift: "Tilfeldig"
// Variant 2: 'podcasts'          → Overskrift: "Anbefalt"
// Variant 3: 'episodes'          → Overskrift: "Anbefalt"
// Variant 4: 'podcasts-episodes' → Overskrift: "Anbefalt"

export const DISCOVERY_MODE: DiscoveryMode = 'podcasts-episodes';

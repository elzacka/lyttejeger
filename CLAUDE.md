# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server (port 5175)
npm run build    # TypeScript + Vite build
npm run lint     # ESLint
```

No test framework configured.

## Architecture

Norwegian podcast PWA using React 19, TypeScript, Vite, Podcast Index API.

### Data Flow

```
Podcast Index API → podcastIndex.ts → podcastTransform.ts → useSearch → Components
                                                           ↓
                                              Dexie (IndexedDB) → useQueue, useSubscriptions
```

### Key Files

- **podcastIndex.ts**: API client (SHA-1 auth, 1 req/sec rate limit, 5-min cache). Requires `VITE_PODCASTINDEX_API_KEY` and `VITE_PODCASTINDEX_API_SECRET`.
  - Full API coverage: Search, Episodes, Podcasts, Recent data, Trending, Live, Soundbites
  - Enhanced error handling with retry logic for transient failures
  - Response validation to catch malformed data early
- **db.ts**: IndexedDB schema. QueueItem stores episode metadata (`publishedAt`, `season`, `episode`).
- **constants.ts**: Shared constants (time intervals, UI values, sort options).
- **curatedContent.ts**: Discovery mode configuration.

### Development Tools

**CORS Proxy** (`cors-proxy.cjs` + `src/utils/corsProxy.ts`):

In development, external resources (chapters, transcripts) may lack CORS headers. Our Vite middleware proxies requests through `/api/cors-proxy?url=...` to fetch server-side and add CORS headers.

```typescript
// src/utils/corsProxy.ts
const isDev = import.meta.env.DEV;

export function getCorsProxyUrl(url: string): string {
  if (!isDev) {
    return url; // Production: fetch directly
  }
  return `/api/cors-proxy?url=${encodeURIComponent(url)}`;
}

// Usage in services
import { getCorsProxyUrl } from '../utils/corsProxy';

const proxiedUrl = getCorsProxyUrl(externalUrl);
const response = await fetch(proxiedUrl);
```

**Pattern**: Wrap all external fetches with `getCorsProxyUrl()`. Middleware automatically strips in production.

### Podcast Index API Implementation

**Complete endpoint coverage** in `podcastIndex.ts`:

**Search Endpoints:**
- `/search/bytitle` - Exact title matching (more precise)
- `/search/byterm` - Fuzzy search across title, author, description
- `/search/byperson` - Search episodes by person tags

**Podcast Lookup:**
- `/podcasts/byfeedid` - Get podcast by feed ID
- `/podcasts/byfeedurl` - Get podcast by RSS feed URL
- `/podcasts/byitunesid` - Get podcast by iTunes/Apple ID
- `/podcasts/byguid` - Get podcast by podcast GUID
- `/podcasts/trending` - Trending podcasts with filters

**Episode Endpoints:**
- `/episodes/byfeedid` - Episodes from one or multiple feeds (up to 200)
- `/episodes/byid` - Get single episode by ID
- `/episodes/byguid` - Get episode by GUID
- `/episodes/live` - Currently live or upcoming episodes

**Recent Data:**
- `/recent/episodes` - Most recent episodes globally
- `/recent/feeds` - Recently updated feeds
- `/recent/data` - Combined recent feeds + episodes
- `/recent/soundbites` - Recent podcast soundbites/clips

**Other:**
- `/categories/list` - Get all categories

**Enhanced Features:**
- Automatic retry with exponential backoff for 429 (rate limit) and 5xx errors
- Authentication error detection (401/403)
- Response validation to catch malformed API responses
- 5-minute caching per API Terms of Service
- Rate limiting enforcement (max 1 req/sec)
- Support for all query parameters: `max`, `since`, `lang`, `cat`, `notcat`, `val`, `fulltext`, `pretty`

**Error Handling Pattern:**
```typescript
try {
  const result = await apiRequest<ResponseType>(endpoint, params);
  // Handle successful response
} catch (error) {
  // Specific error messages:
  // - "API authentication failed" for 401/403
  // - "API rate limit exceeded" for 429 after retries
  // - "API server error" for 5xx after retries
  // - "Network error" for connection issues
}
```

### Navigation (App.tsx)

`currentView` state controls main views: `search`, `subscriptions`, `queue`. PodcastDetailView is a full-screen overlay.

**View Components**:
- **HomeView** (formerly SearchView): Search field + recent episodes from last 7 days
- **RecentEpisodesView**: Component showing recent episodes (lazy-loaded in HomeView)
- **MyPodsView** (formerly SubscriptionsView): Grid of subscribed podcasts
- **QueueView**: Episode queue with swipe-to-delete and reorder

## iOS Audio - CRITICAL

**READ BEFORE MODIFYING AudioPlayer.tsx** - iOS Safari causes silent failures.

1. **User Gesture Chain**: `audio.play()` must be synchronous in tap context. NO async before play().
2. **Explicit Initialization**: Call `audio.load()` on episode change.
3. **Mount Stability**: AudioPlayer stays at App.tsx root level.
4. **Lock Screen Resume**: Media Session `play` handler must `load()` + wait for `canplay` if play fails.
5. **Visibility Change**: Detect and resume interrupted audio when returning from lock screen.

```javascript
// Lock screen handler pattern
navigator.mediaSession.setActionHandler('play', async () => {
  try {
    await audio.play();
  } catch {
    audio.load();
    await new Promise((r) => audio.addEventListener('canplay', r, { once: true }));
    await audio.play();
  }
});
```

**Test on real iOS device**, not desktop.

## Podcasting 2.0 Features

### Chapters (`src/services/chapters.ts`)

Fetches and parses JSON chapters following the Podcasting 2.0 spec. Chapters are cached for 30 minutes.

```typescript
import { fetchChapters, getCurrentChapter, formatChapterTime } from '../services/chapters';

// Fetch chapters from episode metadata
const chapters = await fetchChapters(episode.chaptersUrl);

// Get current chapter based on playback time
const currentChapter = getCurrentChapter(chapters, currentTime);
```

**Pattern**: Display chapters in collapsible panel. Highlight current chapter based on playback position. Allow seeking by clicking chapter items.

### Transcripts (`src/services/transcripts.ts`)

Fetches and parses transcripts in multiple formats: SRT, VTT, JSON, and HTML.

**Multi-format strategy**:
1. Try common extensions first: `.vtt`, `.srt`, `.json`
2. Try original URL last
3. Auto-detect format from content-type or content patterns
4. Fall back to HTML parsing for non-standard formats

```typescript
import { fetchTranscript, getCurrentSegment, formatTranscriptTime } from '../services/transcripts';

// Fetch transcript (auto-detects format)
const transcript = await fetchTranscript(episode.transcriptUrl);

// Get current segment based on playback time
const currentSegment = getCurrentSegment(transcript, currentTime);
```

**HTML Transcript Parsing**:

For podcasts that provide HTML transcripts (e.g., Changelog.com):
- Parses `<p>` tags from HTML using DOMParser
- Removes `<a>` tags and strips URLs from text
- Extracts speaker names using pattern `"Speaker Name: text"`
- Assigns estimated timestamps (5 seconds per segment)
- Skips segments shorter than 10 characters

```typescript
// Example HTML pattern matched:
// <p>John Doe: This is what they said about the topic.</p>
// Result: { speaker: "John Doe", text: "This is what they said...", startTime: 0, endTime: 5 }
```

**Pattern**: Display transcript in collapsible panel with auto-scroll. Highlight current segment. Allow seeking by clicking segments. Display speaker names in bold.

### Episode Badges (`src/components/EpisodeBadges.tsx`)

Reusable component that displays chapter/transcript indicators on episode cards:

```typescript
import { EpisodeBadges } from './EpisodeBadges';

<EpisodeBadges
  chaptersUrl={episode.chaptersUrl}
  transcriptUrl={episode.transcriptUrl}
/>
```

Icons only show when:
1. Feature is enabled in `FEATURES` config
2. Episode has the corresponding URL metadata

**Consistency**: AudioPlayer uses same `List` icon for chapters button as EpisodeBadges uses for chapters indicator.

## Desktop Layout - PROTECTED

All content uses **800px max-width** with dynamic padding:

```css
padding: var(--space-md) max(var(--space-md), calc((100% - 800px) / 2));
```

**Ask before modifying**: App.css, TopNav.module.css, PodcastDetailView.module.css max-width/padding values.

## React Hooks

Hooks before conditional returns. This caused a production bug:

```typescript
// WRONG
if (items.length === 0) return null;
const ref = useRef(); // Hook after conditional

// CORRECT
const ref = useRef();
if (items.length === 0) return null;
```

## TypeScript - Browser Context

Use browser-compatible types for timers and events:

```typescript
// WRONG - Node types not available in browser
const timer = useRef<NodeJS.Timeout | null>(null);

// CORRECT - window.setTimeout returns number
const timer = useRef<number | null>(null);
timer.current = window.setTimeout(() => {}, 500);
```

## Mobile Touch Events

For custom gestures (swipe, long-press), follow these patterns:

### Long-Press Pattern (500ms)
```typescript
const longPressTimer = useRef<number | null>(null);
const longPressTriggered = useRef(false);

const handleTouchStart = () => {
  longPressTriggered.current = false;
  longPressTimer.current = window.setTimeout(() => {
    longPressTriggered.current = true;
    // Trigger action
    if ('vibrate' in navigator) {
      navigator.vibrate(50); // Haptic feedback
    }
  }, 500);
};

const handleTouchEnd = () => {
  if (longPressTimer.current) {
    clearTimeout(longPressTimer.current);
  }
  if (!longPressTriggered.current) {
    // Handle tap
  }
};
```

### Swipe Gesture Pattern
```typescript
const handleTouchMove = (e: React.TouchEvent) => {
  if (isSwiping) {
    e.preventDefault(); // CRITICAL: Prevent scroll interference
    // Handle swipe transform
  }
};
```

**Always use `e.preventDefault()` in touchmove** when implementing swipe gestures to prevent scroll conflict.

**Use `e.stopPropagation()` in drag handlers** to prevent gesture conflicts when multiple touch interactions exist (e.g., swipe + drag).

## Design System Consistency

### Focus States
All circular buttons (`border-radius: 50%`) must have circular focus outlines:

```css
.circularButton {
  border-radius: 50%;
  /* ... */
}

.circularButton:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 50%; /* Match button shape */
}
```

### Z-Index & Stacking Contexts - CRITICAL

**Always use React Portal for popovers/modals** to avoid z-index conflicts:

```typescript
import { createPortal } from 'react-dom';

// Calculate position dynamically
const rect = triggerRef.current.getBoundingClientRect();
const position = {
  top: rect.bottom + 8,
  right: window.innerWidth - rect.right,
};

// Render outside DOM hierarchy
{isOpen && createPortal(
  <div style={{ position: 'fixed', top: `${position.top}px`, right: `${position.right}px`, zIndex: 9999 }}>
    {/* Popover content */}
  </div>,
  document.body
)}
```

**Why Portal is required**:
- Z-index only works within same stacking context
- Positioned elements (`position: relative/absolute/fixed/sticky`) create new stacking contexts
- Siblings with positioning can paint over each other regardless of z-index
- Portal renders directly under `<body>`, bypassing all stacking contexts

**Z-index tokens** (from `tokens.css`):
```css
--z-base: 0;
--z-dropdown: 100;
--z-sticky: 200;
--z-modal: 500;
--z-popover: 600;
--z-tooltip: 700;
--z-max: 9999;
```

**Pattern**: SearchHelp component demonstrates proper Portal usage with dynamic positioning, resize/scroll listeners, and click-outside handling.

**EpisodeCard Context Menu**: Uses Portal pattern for dropdown menu to avoid z-index conflicts with sibling cards. Menu position calculated dynamically based on button position, with scroll/resize listeners.

### Typography & View Headers

All view headers use consistent styling:
```css
.title {
  font-size: var(--font-xs);
  font-weight: 400;
  color: var(--text-muted);
}
```

Applied to: "Siste 7 dager", "Mine podder", "Min kø", "Søketips", etc.

### Count Badges

Consistent badge pattern across all views:
```css
.badge {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: var(--badge-size);
  min-height: var(--badge-size);
  padding: 0 var(--space-xs);
  background: var(--accent);
  color: var(--color-white);
  font-family: var(--font-mono);
  font-size: var(--font-badge);
  font-weight: 500;
  line-height: var(--leading-none);
  border-radius: var(--radius-full);
  aspect-ratio: 1 / 1; /* Ensures perfect circle */
}
```

Badge is rendered inline with title: `<h2 className={styles.title}>Title <span className={styles.badge}>Count</span></h2>`

### Context Menus

For compact menus with minimal whitespace:
```css
.menuDropdown {
  display: flex;
  flex-direction: column;
  width: max-content; /* Fit content width */
  padding: var(--space-1-5); /* 6px */
  gap: var(--space-1); /* 4px between items */
}

.menuItem {
  width: auto; /* Not 100% - fit content only */
  padding: var(--space-2) var(--space-3); /* 8px vertical, 12px horizontal */
  white-space: nowrap;
}
```

### Mobile UX Patterns
- **Delete actions**: Long-press (500ms) → Modal dialog with "Avbryt"/"Slett"
- **Reorder on mobile**: Long-press → Reorder mode with floating toolbar
- **Swipe actions**: Min 60px wide, 80px on mobile for easier touch
- **Cover art sizing**: Balance visibility with space efficiency (64px typical for queue items)

### AudioPlayer Content Panels

Chapters and transcripts display in dedicated `.contentPanels` wrapper outside main controls to prevent layout conflicts:

```css
/* Dedicated area for collapsible content */
.contentPanels {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}

/* Professional transcript styling */
.transcriptList {
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs);
  max-height: 250px;
  overflow-y: auto;
  padding: var(--space-xs);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}

/* Custom scrollbar for webkit browsers */
.transcriptList::-webkit-scrollbar {
  width: 8px;
}

.transcriptList::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}

/* Compact transcript items */
.transcriptItem {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  padding: var(--space-2xs) var(--space-xs);
  text-align: left;
}

.transcriptTime {
  font-family: var(--font-mono);
  font-size: var(--font-2xs);
  color: var(--text-muted);
  min-width: 36px;
  flex-shrink: 0;
}

.transcriptText {
  font-family: var(--font-sans);
  font-size: var(--font-xs);
  line-height: var(--leading-relaxed);
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: normal;
}

.transcriptText strong {
  font-weight: 600;
  color: var(--text-secondary);
}
```

**Pattern**: Keep chapters/transcript panels structurally separate from playback controls to avoid overlap with close button or other UI elements on mobile.

## Monorepo

Lives in `designsystem/apps/lyttejeger/`. Uses `@designsystem/tokens` and `@designsystem/core`.

GitHub Action syncs to standalone `elzacka/lyttejeger` repo on push to main (copies icons/tokens, rewrites imports).

## Maintenance Protocol

**Before starting any task**:
1. Read relevant sections of this file
2. Check if patterns/rules apply to current work
3. Follow established patterns (iOS audio, touch events, focus states, etc.)

**CRITICAL - Code Modification Safeguards**:
1. **Never remove existing functionality** when implementing new features unless explicitly requested
2. **Apply changes consistently** across both desktop AND mobile unless specifically told otherwise
3. **Test interaction states**: If adding hover effects, ensure they work correctly without breaking existing click/touch behavior
4. **Preserve expand/collapse**: When modifying episode cards, verify expand/collapse still works in all views (HomeView, QueueView, PodcastDetailView)
5. **Cross-check all variants**: Changes to EpisodeCard must work in both 'default' and 'queue' variants
6. **Long-press must not block normal clicks**: Use event handlers carefully to prevent blocking expand/collapse functionality
7. **Visual consistency**: Play overlays, hover states, and interactive elements should behave consistently across all views

**Common mistakes to avoid**:
- Removing expand/collapse when adding long-press functionality
- Adding desktop-only CSS without mobile equivalent
- Breaking existing touch events when adding new gesture handlers
- Using `preventDefault()` or `stopPropagation()` without considering side effects on other interactions

**After fixing bugs or implementing new patterns**:
1. Document the pattern/solution in appropriate section
2. Include code examples for clarity
3. Mark critical items with **CRITICAL** or **PROTECTED**
4. Keep examples concise but complete

**Keeping this file efficient**:
- Remove outdated patterns when architecture changes
- Consolidate duplicate information
- Use code examples instead of lengthy explanations
- Focus on "gotchas" and non-obvious patterns

## Language & Localization

- **Language**: Norwegian (Bokmål)
- **Category translations**: `categoryTranslations.ts`
- **Language display**: `languages.ts` - `toNorwegianLanguage()` converts API language names/codes to Norwegian
  - Supports both English names ("English" → "Engelsk") and ISO 639-1 codes ("en" → "Engelsk")
  - Used in PodcastDetailView to display podcast language in Norwegian

## Other Notes

- **ErrorBoundary**: Wrap new views with `viewName` prop for Norwegian error messages.
- **CSP**: Update `public/_headers` when adding external resources.
- **Screenshots**: Check `dev_only/` folder.

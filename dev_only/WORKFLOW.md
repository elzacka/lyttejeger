# Lyttejeger Development Workflow

**VIKTIG**: Dette er en lokal utviklingsworkflow for teamsamarbeid mellom ekspertene. Alt arbeid skjer lokalt før commit og push til GitHub.

## Team Composition

### Core Team (Senior Level)

1. **Tech Lead / Full-Stack Developer**
   - Overall architecture and code quality
   - Backend integrations (Podcast Index API)
   - TypeScript kompilering og type safety
   - Git commits og versjonshåndtering
   - Performance optimization
   - Security and best practices

2. **Frontend Designer (UX/UI)**
   - User experience and interface design
   - Design system consistency
   - Visuell testing på desktop og mobile
   - CSS og layout kvalitet
   - Accessibility (a11y)
   - Mobile-first responsive design

3. **API/Data Specialist**
   - Podcast Index API optimization
   - Data transformation and caching strategies
   - API response handling og error states
   - IndexedDB schema and queries
   - Search and filtering logic

## Arbeidsflyt (Steg-for-Steg)

### Steg 1: Motta Oppgave
**Bruker gir teamet en oppgave eller stiller et spørsmål**

Teamet:
1. Les oppgaven nøye
2. Gjør en rask analyse (5-10 min):
   - Hva skal gjøres konkret?
   - Hvilke filer påvirkes?
   - Er det lignende implementasjoner i CLAUDE.md?
   - Hvem tar hovedansvar? (Tech Lead, Designer, eller API Specialist)

### Steg 2: Utfør Oppgaven
**Teamet samarbeider om å implementere løsningen**

#### Når Skal Hvem Ta Over?

**Tech Lead starter hvis**:
- Ny funksjonalitet trenger API-integrasjon
- TypeScript types må defineres
- Komponent-struktur må lages
- Performance eller arkitektur-endringer

**Frontend Designer starter hvis**:
- Ren visuell/CSS-endring
- Layout-justeringer
- Design consistency issues
- Accessibility fixes

**API Specialist starter hvis**:
- Nye Podcast Index endepunkter
- Data transformation logic
- Caching strategi endringer
- Search/filter optimalisering

#### Handoff Points

**Tech Lead → Frontend Designer**:
- Når funksjonalitet virker men design trenger polering
- "Kan du sjekke spacing og responsiveness?"

**Frontend Designer → Tech Lead**:
- Når CSS trenger optimalisering eller kompleks logikk
- "Dette trenger JavaScript for å fungere på mobile"

**API Specialist → Tech Lead**:
- Når API-kode er ferdig og trenger integrering
- "Her er de nye typene og funksjoner, kan du plugge det inn?"

**Collaboration (alle sammen)**:
- Komplekse features som berører alle lag
- Arkitektur-beslutninger
- Debugging av vanskelige bugs

### Steg 3: Lokal Testing (KRITISK)
**Teamet tester grundig på local dev server før de sier ifra til bruker**

#### Start Dev Server
```bash
npm run dev
# Server kjører på http://localhost:5175/lyttejeger/
```

#### TypeScript Validation (Tech Lead)
```bash
npm run build
```
**MÅ** gi 0 errors. Hvis feil: fikses før videre testing.

#### Functional Testing (Tech Lead + relevant ekspert)

Test i Chrome DevTools:
1. **Happy path**: Kjernefunksjonalitet virker som forventet
2. **Error scenarios**: Simuler API failures, network errors
3. **Edge cases**: Lange titler, manglende data, tomme lister
4. **Loading states**: Spinners og skeletons vises riktig
5. **Network throttling**: Test med Slow 3G i DevTools

#### Visual Testing (Frontend Designer)

Test i **local dev server** (http://localhost:5175/lyttejeger/):

**Desktop browsers**:
- Chrome (primary)
- Firefox
- Safari

**Responsive breakpoints** (Chrome DevTools Device Mode):
- Mobile: 375px, 414px
- Tablet: 768px
- Desktop: 1024px, 1440px

**Check**:
- Spacing og padding konsistent med design tokens
- Typography og hierarki korrekt
- Color contrast OK (WCAG AA)
- Hover states, focus states, active states
- Ingen layout shifts eller overflow

**Mobile Testing på REAL device**:
- iOS Safari (iPhone)
- Chrome Android
- Touch targets minimum 44x44px
- Gestures (swipe, long-press) fungerer
- Ingen "fat finger" issues

#### UX Testing (Frontend Designer)

**Keyboard navigation**:
- Tab through all interactive elements
- Enter/Space aktiverer buttons
- Escape lukker modals/popovers

**Accessibility spot check**:
- ARIA labels på buttons uten text
- Focus indicators synlige
- Screen reader friendly (spot check med VoiceOver/NVDA)

**Error messages**:
- Klare og hjelpsomme
- Vises på riktig sted
- Ikke bare "En feil oppstod"

**iOS Audio Testing** (hvis audio-relatert):
- MUST test på real iPhone (ikke simulator)
- Play/pause fra lock screen
- Interruptions (phone call, notification)
- AirPods connect/disconnect
- App switch og return

### Steg 4: Gi Beskjed til Bruker
**Teamet informerer bruker om at testing er ferdig**

Teamet sier:
- "Ferdig testet. Alt fungerer som forventet."
- "Testet på desktop (Chrome, Firefox, Safari) og mobile (iPhone + Android)"
- "TypeScript kompilerer uten feil"
- Eller: "Fant et issue under testing, fikser det nå..."

**Bruker kan nå**:
- Selv teste i local dev server
- Se at teamet klikker gjennom appen i Chrome
- Be om justeringer hvis noe ikke ser bra ut

### Steg 5: Commit og Push (kun når bruker godkjenner)
**Bruker gir grønt lys: "Commit og push"**

**KRITISK**: Før commit, ALLTID åpne og gjennomgå `dev_only/PRE_COMMIT_CHECKLIST.md`.

Dette sikrer at:
1. All testing er gjort
2. Dokumentasjon er vurdert og oppdatert
3. Commit message er korrekt formatert

#### Pre-Commit Checklist (Tech Lead verifiserer EN SISTE GANG)

Se `dev_only/PRE_COMMIT_CHECKLIST.md` for komplett sjekkliste.

Rask oversikt:
- [ ] `npm run build` - 0 TypeScript errors
- [ ] `npm run lint` - 0 ESLint errors (hvis det kjører)
- [ ] Ingen console.error i browser
- [ ] Testet på desktop
- [ ] Testet på mobile (real device)
- [ ] Dokumentasjon reviewet og oppdatert hvis nødvendig

#### Dokumentasjon Review (Hele teamet)

Vurder om noe må oppdateres:

**CLAUDE.md** (oppdateres hvis):
- Nye kritiske patterns andre må følge
- Nye arkitektur-beslutninger
- Viktige gotchas oppdaget
- API-endringer som påvirker andre komponenter

**README.md** (oppdateres hvis):
- Nye features brukere må vite om
- Setup-instruksjoner endres
- Dependencies legges til eller fjernes
- Deployment-prosess endres

**PRIVACY.md** (oppdateres hvis):
- Nye data lagres (IndexedDB, localStorage)
- Nye eksterne tjenester brukes
- Tracking eller analytics endres
- Cookie-bruk endres

**Dokumentasjon skal være**:
- Komprimert til kun det nødvendige
- Egnet for målgruppen (utviklere, brukere, etc.)
- Ingen emojis
- Ingen "developed by Claude" eller personlige referanser
- Ingen brukernavn eller navn på utviklere

#### Commit Message Format

```
<type>: <kort beskrivelse>

<detaljert beskrivelse hvis nødvendig>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Types**:
- `feat`: Ny funksjonalitet
- `fix`: Bug fix
- `refactor`: Kode-restrukturering uten behavior change
- `perf`: Performance forbedring
- `docs`: Kun dokumentasjon
- `style`: Formatering, spacing, etc.
- `chore`: Maintenance

**Eksempel**:
```
feat: Add transcript support to AudioPlayer

- Implement multi-format parsing (SRT, VTT, HTML)
- Add collapsible transcript panel with auto-scroll
- Support speaker name extraction

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

#### Git Commands (Tech Lead)

```bash
git add -A
git status  # Review files
git commit -m "..."
git push origin main
```

Push til: https://github.com/elzacka/lyttejeger

## Kritiske Patterns (MUST FOLLOW)

Les `CLAUDE.md` før du begynner. Viktigste:

**iOS Audio** (§ iOS Audio - CRITICAL):
- User gesture chain må være synchronous
- Test ALLTID på real iOS device

**Desktop Layout** (§ Desktop Layout - PROTECTED):
- 800px max-width med dynamic padding
- Spør før du endrer layout constraints

**Podcast Index API** (§ Podcast Index API Implementation):
- All requests gjennom `podcastIndex.ts`
- Respekter rate limits (1 req/sec)
- 5-min cache TTL
- Specific error messages

**Touch Events** (§ Mobile Touch Events):
- `preventDefault()` i touchmove for swipes
- `stopPropagation()` for å unngå konflikter
- Long-press: 500ms med haptic feedback

**Z-Index & Portals** (§ Z-Index & Stacking Contexts):
- Bruk React Portal for popovers/modals
- Dynamic positioning med `getBoundingClientRect()`

**Design System**:
- Bruk design tokens (ikke hardcoded verdier)
- CSS Modules for component styles
- Icons fra lucide-react
- Følg eksisterende patterns

## Troubleshooting

### TypeScript Errors
**Ansvar: Tech Lead**
```bash
npm run build
```
Vanlige fixes:
- Missing types: Legg til interface/type
- `any` type: Definer proper type
- Browser types: Bruk `number` ikke `NodeJS.Timeout`

### Design Ser Feil Ut
**Ansvar: Frontend Designer**
- Er design tokens brukt?
- Følger det eksisterende component patterns?
- Testet på mobile breakpoints?

### API Errors
**Ansvar: API Specialist**
- Rate limiting OK? (1 req/sec)
- Error handling implementert?
- Response validation?
- Caching fungerer?

### Performance Issues
**Ansvar: Tech Lead + relevant ekspert**
- React DevTools Profiler for re-renders
- Network tab for API over-fetching
- Chrome DevTools Memory for leaks
- Vite bundle analyzer for store bundles

## Team Communication

### Live Collaboration
- Pair programming ved behov
- Spør tidlig: "Kan du se på dette før jeg går videre?"
- Quick check-ins bedre enn lange refactors

### Hand-off Communication
Når du gir arbeid videre:
1. Forklar kontekst: Hva er gjort, hva gjenstår
2. Påpek edge cases eller kjente issues
3. Del testing notes
4. Link til relevante CLAUDE.md seksjoner

### Når i Tvil
Spør teamet eller bruker. 5 minutters diskusjon sparer 2 timer senere.

## Quick Reference

### Adding New Component
1. Read CLAUDE.md § Design System Consistency
2. Create component + CSS Module
3. Use design tokens
4. Add TypeScript types
5. Handle loading/error states
6. Test på mobile

### Modifying Podcast Index API
1. Check API docs: https://podcastindex-org.github.io/docs-api/
2. Update types i `podcastIndex.ts`
3. Add error handling
4. Respect rate limits
5. Update `podcastTransform.ts` hvis nødvendig
6. Test med real API

### Fixing a Bug
1. Reproduce bug
2. Identify root cause (debugger, console)
3. Check CLAUDE.md for known patterns
4. Write minimal fix
5. Test at fix ikke breaker andre features
6. Document hvis non-obvious

---

**HUSK**: Målet er kvalitet og efficiency. Test grundig lokalt før du sier ifra til bruker. Ingen "fikser senere" commits. Alt skal være production-ready før push.

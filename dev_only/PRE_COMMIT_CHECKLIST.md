# Pre-Commit Checklist

**KRITISK**: Denne sjekklisten MÅ gjennomgås før hver commit.

## 1. Testing (Obligatorisk)

- [ ] `npm run build` - 0 TypeScript errors
- [ ] `npm run lint` - 0 ESLint errors (hvis tilgjengelig)
- [ ] Ingen console.error i browser console
- [ ] Testet på desktop (Chrome minimum, Firefox/Safari hvis mulig)
- [ ] Testet på mobile (real device eller DevTools responsive mode)
- [ ] All ny funksjonalitet fungerer som forventet
- [ ] Ingen regression av eksisterende funksjonalitet

## 2. Dokumentasjon Review (Obligatorisk)

### CLAUDE.md
Må oppdateres hvis:
- [ ] Nye kritiske patterns andre må følge
- [ ] Nye arkitektur-beslutninger
- [ ] Viktige gotchas oppdaget
- [ ] API-endringer som påvirker andre komponenter
- [ ] Nye layout patterns eller constraints

### README.md
Må oppdateres hvis:
- [ ] Nye brukersynlige features
- [ ] Setup-instruksjoner endres
- [ ] Dependencies legges til eller fjernes
- [ ] Deployment-prosess endres

### PRIVACY.md
Må oppdateres hvis:
- [ ] Nye data lagres (IndexedDB, localStorage)
- [ ] Nye eksterne tjenester brukes
- [ ] Tracking eller analytics endres
- [ ] Cookie-bruk endres

**Dokumentasjonsregler**:
- Komprimert til kun det nødvendige
- Egnet for målgruppen (utviklere, brukere, etc.)
- Ingen emojis
- Ingen "developed by Claude" eller personlige referanser
- Ingen brukernavn eller navn på utviklere

## 3. Git Commands

```bash
# Review changes
git status
git diff

# Stage changes
git add -A

# Review staged changes
git diff --staged

# Commit with proper message
git commit -m "type: short description

Detailed description if needed

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push to GitHub
git push origin main
```

## 4. Commit Message Types

- `feat`: Ny funksjonalitet
- `fix`: Bug fix
- `refactor`: Kode-restrukturering uten behavior change
- `perf`: Performance forbedring
- `docs`: Kun dokumentasjon
- `style`: Formatering, spacing, etc.
- `chore`: Maintenance

## Unntak

Dokumentasjon trenger IKKE oppdateres for:
- Rene CSS/styling tweaks som ikke introduserer nye patterns
- Bug fixes som ikke endrer API eller behavior
- Interne refactorings som ikke påvirker utviklere som jobber med andre deler
- Typo-rettinger

Men ved tvil: **Oppdater heller for mye enn for lite**.

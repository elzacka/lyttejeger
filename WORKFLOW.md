# Lyttejeger Development Workflow

## Team Composition

### Core Team (Senior Level)

1. **Tech Lead / Full-Stack Developer**
   - Overall architecture and code quality
   - Backend integrations (Podcast Index API)
   - Performance optimization
   - Security and best practices

2. **Frontend Designer (UX/UI)**
   - User experience and interface design
   - Design system consistency
   - Accessibility (a11y)
   - Mobile-first responsive design

3. **API/Data Specialist**
   - Podcast Index API optimization
   - Data transformation and caching strategies
   - IndexedDB schema and queries
   - Search and filtering logic

## Development Workflow

### Phase 1: Analyze & Plan (MANDATORY)

**Before writing any code**, the team must complete this analysis:

#### 1.1 Requirements Analysis (5-10 min)
- **What**: Clearly define the feature/fix
- **Why**: Understand user need and business value
- **Scope**: Break down into concrete, measurable tasks

#### 1.2 Technical Review (5-10 min)
Review relevant documentation:
- `CLAUDE.md` - Check existing patterns and constraints
- `src/config/features.ts` - Check feature flags
- Affected components/services

Ask critical questions:
- Does this affect existing functionality?
- Are there similar implementations we can follow?
- What edge cases exist?
- Mobile vs desktop considerations?

#### 1.3 Team Consultation (as needed)
- **API changes**: API/Data Specialist reviews Podcast Index integration
- **UI/UX changes**: Frontend Designer reviews design consistency
- **Architecture changes**: Tech Lead reviews impact on overall system

**Output**: Brief implementation plan (2-5 bullet points)

### Phase 2: Implementation

#### 2.1 Code Standards

**TypeScript**:
- Strict mode enabled
- No `any` types without explicit reasoning
- Proper interface definitions for all API responses
- Browser-compatible types (use `number` for timers, not `NodeJS.Timeout`)

**React**:
- Hooks before conditional returns (rules of hooks)
- Use `useCallback` and `useMemo` for performance-critical code
- Prefer composition over inheritance

**CSS**:
- CSS Modules for component styles
- Use design tokens from `tokens.css`
- Mobile-first approach
- Test on real iOS device for audio features

**File Organization**:
- One component per file
- Co-locate tests with components (when added)
- Keep files under 400 lines (split if larger)

#### 2.2 Critical Patterns (MUST FOLLOW)

**iOS Audio** (see CLAUDE.md § iOS Audio - CRITICAL):
- User gesture chain must be synchronous
- Always test on real iOS device

**Desktop Layout** (see CLAUDE.md § Desktop Layout - PROTECTED):
- 800px max-width with dynamic padding
- Ask before modifying layout constraints

**Podcast Index API** (see CLAUDE.md § Podcast Index API Implementation):
- All requests must go through `podcastIndex.ts`
- Respect rate limits (1 req/sec)
- Use 5-min cache TTL
- Handle errors with specific messages

**Touch Events** (see CLAUDE.md § Mobile Touch Events):
- Always `preventDefault()` in touchmove for swipes
- Use `stopPropagation()` to prevent gesture conflicts
- Long-press: 500ms with haptic feedback

**Z-Index & Portals** (see CLAUDE.md § Z-Index & Stacking Contexts):
- Always use React Portal for popovers/modals
- Calculate position dynamically with `getBoundingClientRect()`

#### 2.3 Incremental Development

1. **Start small**: Implement minimal working version
2. **Test early**: Verify functionality before adding complexity
3. **Iterate**: Refine based on testing and feedback

### Phase 3: Quality Assurance

#### 3.1 Code Review Checklist

**Functionality**:
- [ ] Feature works as specified
- [ ] Edge cases handled
- [ ] Error states handled gracefully
- [ ] Loading states implemented

**Cross-platform**:
- [ ] Works on desktop (Chrome, Firefox, Safari)
- [ ] Works on mobile (iOS Safari, Chrome Android)
- [ ] Responsive design verified
- [ ] Touch interactions tested on real device

**Performance**:
- [ ] No unnecessary re-renders
- [ ] API calls optimized (caching, batching)
- [ ] Images optimized
- [ ] No memory leaks (cleanup in useEffect)

**Accessibility**:
- [ ] Keyboard navigation works
- [ ] Focus states visible
- [ ] ARIA labels on interactive elements
- [ ] Color contrast meets WCAG AA

**Code Quality**:
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Consistent with existing patterns
- [ ] Comments on complex logic

**Design System**:
- [ ] Uses design tokens (no hardcoded colors/spacing)
- [ ] Follows existing component patterns
- [ ] Typography consistent
- [ ] Icons from lucide-react

#### 3.2 Testing Protocol

**Manual Testing** (required):
1. Test happy path
2. Test error scenarios
3. Test edge cases (empty states, long text, etc.)
4. Test on mobile device (iOS + Android)
5. Test with slow network (throttling in DevTools)

**Build Verification**:
```bash
npm run build  # Must succeed without errors
```

### Phase 4: Documentation

#### 4.1 Code Documentation

**When to document**:
- Complex algorithms or business logic
- Non-obvious design decisions
- Performance optimizations
- Workarounds for browser bugs

**What to document**:
- Why, not what (code shows what)
- Trade-offs considered
- Links to relevant issues/discussions

#### 4.2 CLAUDE.md Updates

Update `CLAUDE.md` when:
- Adding new patterns others should follow
- Discovering critical gotchas
- Changing architecture significantly
- Adding new critical sections (like iOS Audio)

**Format**:
- Be concise (code examples > prose)
- Mark critical items with **CRITICAL** or **PROTECTED**
- Include "why" for non-obvious rules

### Phase 5: Commit & Deploy

#### 5.1 Commit Message Format

```
<type>: <short description>

<detailed description if needed>

<breaking changes if any>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring without behavior change
- `perf`: Performance improvement
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples**:
```
feat: Add transcript support to AudioPlayer

- Implement multi-format transcript parsing (SRT, VTT, HTML)
- Add collapsible transcript panel with auto-scroll
- Support speaker name extraction and display

fix: Prevent episode card expand/collapse from triggering on long-press

Long-press gesture was preventing normal tap behavior. Added flag to
track long-press state and skip click handler when triggered.
```

#### 5.2 Pre-commit Checklist

- [ ] `npm run build` succeeds
- [ ] No console errors in browser
- [ ] Tested on mobile device
- [ ] CLAUDE.md updated (if pattern changes)
- [ ] Commit message is clear and descriptive

## Quick Reference: Common Tasks

### Adding a New Component

1. Read CLAUDE.md § Design System Consistency
2. Create component file with CSS Module
3. Use design tokens (no hardcoded values)
4. Add proper TypeScript types
5. Handle loading/error states
6. Test on mobile

### Modifying Podcast Index API

1. Check API docs: https://podcastindex-org.github.io/docs-api/
2. Update types in `podcastIndex.ts`
3. Add proper error handling
4. Respect rate limits
5. Update `podcastTransform.ts` if needed
6. Test with real API (not mock data)

### Fixing a Bug

1. Reproduce the bug
2. Identify root cause (use debugger, console.logs)
3. Check if it's a known pattern in CLAUDE.md
4. Write minimal fix
5. Test that fix doesn't break other features
6. Document if it's a non-obvious fix

### Improving Performance

1. Profile first (React DevTools Profiler)
2. Identify actual bottleneck (don't optimize blindly)
3. Apply targeted optimization
4. Measure improvement
5. Document trade-offs if any

## Emergency Hotfix Process

For critical production bugs:

1. **Assess severity**: Does it block core functionality?
2. **Quick fix**: Minimal change to restore functionality
3. **Test thoroughly**: Verify fix doesn't introduce new issues
4. **Deploy immediately**: Push to production
5. **Follow-up**: Schedule proper fix in next sprint if needed

## Team Communication

### Daily Sync (5-10 min)
- What did you complete yesterday?
- What are you working on today?
- Any blockers?

### Code Review Protocol
- Reviews should happen within 24 hours
- Be constructive and specific
- Suggest alternatives, don't just criticize
- Approve if no blocking issues

### Design Review Protocol
- Designer reviews all UI changes before implementation
- Use Figma/screenshots for alignment
- Focus on consistency with existing design system
- Mobile mockups required for new features

## Continuous Improvement

**Monthly Retrospective**:
- What went well?
- What can be improved?
- Action items for next month

**Update this workflow**:
- When discovering better practices
- When team composition changes
- When technology changes

---

**Remember**: This workflow exists to maintain quality and consistency, not to slow down development. When in doubt, ask the team. It's better to discuss for 5 minutes than to rewrite for 2 hours.

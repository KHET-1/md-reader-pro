# MD Reader Pro — What’s Next (Phase 2 Kickoff Plan)

## Summary
- Current version: 3.3.0 (Phase 1 complete; security/perf modernization shipped)
- Phase 2 focus: Advanced Animations & Micro-interactions
- Readiness: 75/100 (docs/phase-reports/PHASE_2_READINESS_REPORT.md)
- Immediate priorities (pre-work):
  1) Extract inline CSS from index.html into modular files
  2) Build AnimationManager (requestAnimationFrame-based) + orchestration helpers
  3) Add prefers-reduced-motion support and accessibility toggles
  4) Replace transition: all with explicit property transitions
- Housekeeping: Align documentation with current versions (marked, webpack, DOMPurify), commit Phase 2 readiness report, and set Phase 2 performance budgets.

## Details
### Repository status
- Branch: main (in sync with origin)
- Untracked: docs/phase-reports/PHASE_2_READINESS_REPORT.md (add and commit)
- Package versions (key):
  - marked ^16.3.0, dompurify ^3.2.7, prismjs ^1.30.0
  - webpack ^5.102.0, Playwright ^1.55.0, Jest ^29.5.0

### Documentation mismatches to fix
- README still references “Marked.js v5.1.2” while package.json is ^16.3.0
- SERVICES.md dependency table shows older versions (e.g., marked@5.1.2, webpack@5.88.0)
- SECURITY.md lists supported versions 5.x/4.x (project is 3.x). Update policy or add a project-specific support statement.

### Phase 2 pre-work (2–3 days)
1) CSS extraction (HIGH)
   - Create src/styles/{variables.css,base.css,layout.css,components.css,animations.css,utilities.css}
   - Move all inline CSS from index.html to these files
   - Wire up in webpack and confirm minification and caching
2) Animation infrastructure (HIGH)
   - src/utils/AnimationManager.js with: animate(), fadeIn/out, slide, scale, sequence(), parallel(), stagger()
   - Use requestAnimationFrame for smooth timing; expose hooks for metrics
3) Accessibility (MEDIUM)
   - Add prefers-reduced-motion media query defaults and a runtime toggle
4) Transition refactor (MEDIUM)
   - Find all transition: all occurrences and replace with transform/opacity-specific transitions

### Phase 2 implementation (5–7 days)
- Smooth tab/content transitions (CSS)
- Micro-feedback (hover, press, load shimmer)
- Touch/gesture support (Pointer Events first; Hammer.js if needed)
- Animation metrics (FPS, jank %, start latency) via Performance API hooks
- Visual regression tests in Playwright + performance assertions

### Performance and budgets
- FPS ≥ 60; frame time < 16.7ms; jank < 1%
- Bundle increase target ≤ +20KB (warn at +25KB; critical at +30KB)
- Memory increase < +8MB after sustained animation runs

### Testing plan
- Unit: easing and timing math; AnimationManager state and cancelation
- Integration: sequences complete; no memory leaks; thresholds met
- E2E: screenshots for key states; gesture flows on mobile emulation

### Operational tasks
- Commit docs/phase-reports/PHASE_2_READINESS_REPORT.md
- Add this Next Steps report to docs/phase-reports and commit
- Update README, SERVICES.md, SECURITY.md for version accuracy and policy
- Ensure CI enforces new animation budgets (tests/performance + thresholds)

## Recommendations
- Adopt Minimal stack (custom rAF AnimationManager + native APIs; no heavy animation libs)
- Stage changes in small PRs: (1) CSS extraction, (2) AnimationManager, (3) A11y + transitions, (4) feature-by-feature animations
- Track budgets in tests and fail CI on regressions

## Action Plan (checklist)
- [ ] Extract CSS to src/styles/* and rebuild
- [ ] Implement AnimationManager + orchestration utilities
- [ ] Add prefers-reduced-motion handling and settings UI
- [ ] Replace transition: all with specific properties
- [ ] Implement smooth tab/content transitions
- [ ] Add hover/press micro-interactions
- [ ] Add touch gestures for mobile
- [ ] Instrument animation performance metrics
- [ ] Expand Playwright tests (visual + performance)
- [ ] Update README, SERVICES.md, SECURITY.md
- [ ] Commit readiness and next-steps reports

## Verification
- All animation tests pass on CI
- Budgets green; bundle delta ≤ 20KB
- 60fps maintained on representative devices
- Docs updated and accurate

## Generated
- 2025-10-02T10:03:44Z
- Auto-generated next steps plan based on Phase 2 readiness report and current repository state.
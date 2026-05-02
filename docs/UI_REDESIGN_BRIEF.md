# Claude Code Brief — Premium UI/UX Redesign (Linear-Inspired)

> **Paste this into Claude Code at the repo root.** Or save it as `docs/UI_REDESIGN_BRIEF.md` and start the session with: *"Read `docs/UI_REDESIGN_BRIEF.md` and execute it phase by phase. Stop after each phase and show me a diff summary before proceeding."*

---

## 0. Mission

Take the **Smart ETF Portfolio Manager** frontend from "functional Tailwind" to a **Linear.app-grade premium product feel** — without violating any of the strategic invariants in `MASTER_PRD.md`. The result must look like an institutional-grade tool that a long-term investor would trust for 30 years, not a flashy trading dashboard.

The aesthetic target is **Linear** (https://linear.app): refined dark + light palette, perfect typography, 1px borders instead of shadows, tabular numerics, tight precise spacing, near-invisible motion. The premium feel comes from **restraint and precision**, never from animation density.

---

## 1. Read These Files First (in this order)

You have full repo access. Before writing any code, read:

1. `MASTER_PRD.md` — the product bible. Section 8 (Frontend) and 8.12 (design rules) are mandatory.
2. `ARCHITECTURE.md` — stack contract.
3. `Sector_Analysis_Module.md` — sector exposure component (touches Dashboard).
4. `linear.app_HTML` (in repo root) — Linear's homepage HTML, scraped. Use it ONLY to confirm token values (colors, type scale, radii). Do **not** copy any Linear copy, illustrations, marketing imagery, or proprietary visuals. Tokens and structural patterns only.
5. `frontend/src/` — the existing code you are upgrading. Do an `ls -R` first to map what exists.

Then summarize back to me, in 8 lines max, what you found and what your plan is. Wait for me to confirm before Phase 1.

---

## 2. Hard Guardrails (do not violate these — non-negotiable)

These come from the PRD and product strategy. Treat them as compile errors.

**Strategy invariants (from PRD §14):**
- ❌ No "performance vs S&P" charts.
- ❌ No live price tickers / real-time updating numbers / number tweens.
- ❌ No flashing, glow, neon, or "deal alert" pulsing.
- ❌ No `expected_return` field anywhere.
- ❌ No "AI thinks this ETF is a great pick!" copy.
- ❌ No countdown timers, urgency banners, or FOMO patterns.

**Technical invariants:**
- ✅ React 18 + Vite + TypeScript **strict** + Tailwind CSS. Do not introduce new heavy libraries (Framer Motion is OK if used minimally; no Material UI / Chakra / DaisyUI).
- ✅ RTL **and** LTR must both work. All spacing uses logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`). Never `ml-`/`mr-`.
- ✅ Dark mode is mandatory and is the **default**. Light mode must also work.
- ✅ All text comes from i18next. No hardcoded Hebrew/English strings in components.
- ✅ All numbers use `font-variant-numeric: tabular-nums` and `Intl.NumberFormat(locale, …)`.
- ✅ Recharts stays the only chart library. Restyle it; do not replace it.
- ✅ Backend untouched. This is a pure frontend pass.

If you ever feel a tension between "looks more premium" and these rules — **the rules win**.

---

## 3. Design DNA (the new system)

This **supersedes** the color list in PRD §8.12. Note this in `docs/DECISIONS/0001-ui-system-linear.md` (create it).

### 3.1 Color tokens

Define these as CSS variables in `frontend/src/styles/tokens.css` and wire them into `tailwind.config.ts` as theme extensions. Use `[data-theme="dark"]` and `[data-theme="light"]` attributes on `<html>`, controlled by Zustand `themeStore`.

**Dark (default):**
```
--bg-base:        #08090A   /* page background */
--bg-surface:     #0E0F11   /* cards, sidebar */
--bg-elevated:    #16181C   /* modals, dropdowns, hover surfaces */
--bg-input:       #1A1C1F
--border-subtle:  #1F2023   /* card borders, dividers */
--border-default: #2E2E32   /* input borders, stronger dividers */
--border-strong:  #3E3E44   /* focus, hover */
--text-primary:   #F7F8F8
--text-secondary: #B4BBC8
--text-muted:     #8A8F98
--text-disabled:  #62666D

--accent:         #5E6AD2   /* Linear indigo — primary actions, links, focus rings */
--accent-hover:   #6E78DC
--accent-muted:   #5E6AD220 /* 12% alpha for hover backgrounds */

--success:        #4CB782   /* drift in-band, valuation fair/cheap */
--warning:        #F2994A   /* soft cap warning */
--danger:         #EB5757   /* hard cap breach, error */
--info:           #02B8CC   /* informational, valuation insufficient_history */
```

**Light:**
```
--bg-base:        #FFFFFF
--bg-surface:     #FAFBFC
--bg-elevated:    #FFFFFF
--bg-input:       #FFFFFF
--border-subtle:  #EBECF0
--border-default: #E2E4E7
--border-strong:  #D0D6E0
--text-primary:   #08090A
--text-secondary: #3E3E44
--text-muted:     #62666D
--text-disabled:  #9C9DA1

--accent:         #5E6AD2
--accent-hover:   #4D58C2
--accent-muted:   #5E6AD212

--success:        #2A845A
--warning:        #B26A1F
--danger:         #C73E3E
--info:           #0993A8
```

### 3.2 Typography

- **Latin body & UI:** `Inter Variable` (already approved). Add `font-feature-settings: "cv11", "ss01", "ss03"` for the Linear-style 'a' and '6/9'.
- **Hebrew:** `Heebo Variable`. Already in PRD.
- **Tabular numbers (everywhere a number appears in a card/table/chart axis/badge):** `font-variant-numeric: tabular-nums`. Add a `.tnum` utility in Tailwind. **This is the single biggest visual upgrade for a financial app — apply it ruthlessly.**
- **Mono (ticker symbols only):** `Geist Mono` or `JetBrains Mono`. Wrap tickers in `<span class="font-mono tracking-tight">VTI</span>`.
- **Type scale** (rem, with line-heights):
  - `text-xs` 12/16  `text-sm` 13/18  `text-base` 14/20  `text-md` 15/22  `text-lg` 17/24  `text-xl` 20/28  `text-2xl` 24/32  `text-3xl` 32/40  `text-4xl` 40/48
  - **Note**: Linear runs at 13–14px base for UI density. Use `text-sm` (13px) for table cells, `text-base` (14px) for body, `text-md` (15px) for card content. Reserve 16px+ for headings.
- **Weights:** 400 body, 500 UI labels, 600 headings & emphasis. Avoid 700+.

### 3.3 Spacing & Radii

- Tailwind 4-pt scale, but the **practical scale** is `1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24` (4–96px). Don't use `5, 7, 9, 10, 11`.
- **Radii:** `--radius-sm: 4px`, `--radius-md: 6px`, `--radius-lg: 8px`, `--radius-xl: 12px`, `--radius-2xl: 16px`. **No fully-rounded cards.** Pills/badges use `--radius-full`.
- **Card padding:** 20px (`p-5`) for compact cards, 24px (`p-6`) for primary cards. Never less than 16px.
- **Section gap:** 24px between cards on Dashboard. 32px between major page sections.

### 3.4 Borders before shadows

Linear's signature: **1px solid borders** carry the visual hierarchy. Use shadows **only** for floating elements (modals, dropdowns, popovers).

- Cards: `border: 1px solid var(--border-subtle); background: var(--bg-surface);` — **no shadow**.
- Hover state on interactive cards: `border-color: var(--border-default);` — that's it.
- Modals/popovers: `box-shadow: 0 1px 2px rgb(0 0 0 / .12), 0 8px 24px rgb(0 0 0 / .24);` (dark) — soft and short.

### 3.5 Motion (the boring part is the point)

- **Duration:** 120ms (micro), 180ms (default), 240ms (modal/sheet enter). Nothing slower.
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` for enter; `cubic-bezier(0.4, 0, 0.2, 1)` for hover/focus.
- **Allowed:** opacity & 4–8px translate on entry; border-color & background-color on hover; sidebar collapse.
- **Forbidden:** number tweens, animated counters, pulse, glow, shimmer skeletons that move, scale > 1.02.
- Skeletons use `var(--bg-elevated)` solid blocks, **no** shimmer.
- Respect `prefers-reduced-motion: reduce` — kill all transitions in that case.

### 3.6 Focus & accessibility

- Every interactive element: `outline: 2px solid var(--accent); outline-offset: 2px;` on `:focus-visible`. No removed outlines.
- Color contrast ≥ 4.5:1 on body text, ≥ 3:1 on UI/iconography. Verify with the Tailwind `oklch` linter or eyeball with axe DevTools.
- All icons get `aria-label` or are `aria-hidden="true"` if decorative.

### 3.7 Iconography

- Lucide React. **Stroke 1.5px** (`<Icon strokeWidth={1.5} />`), 16px in tables, 18px in buttons, 20px in nav.
- Status icons in badges: filled circle 8px, not an icon — let color do the work.

---

## 4. Component-Level Specs

### 4.1 Sidebar (`components/common/Sidebar.tsx`)
- 240px expanded / 56px collapsed. Background `--bg-surface`. Border-end `1px var(--border-subtle)`.
- Each nav item: 32px tall, 8px horizontal padding, 6px radius. Icon + label. Active = `background: var(--accent-muted); color: var(--accent);` (no left bar).
- Bucket selector at top: a button styled as a flat row, opens a Linear-style command popover (cmd+k vibe) on click. Use Radix or `cmdk`. List buckets with their name and time horizon as a muted secondary line.
- Bottom: theme toggle (sun/moon, no labels), language toggle (EN | HE), settings gear. All 24px square buttons.
- **RTL:** sidebar lives on the right when `dir="rtl"`.

### 4.2 Top bar (per page)
- 56px tall, no background, only a `border-bottom: 1px var(--border-subtle);`.
- Page title `text-lg font-semibold` on the start side. Page-specific actions on the end side as `secondary` buttons.

### 4.3 Cards (`components/common/Card.tsx`)
- One component, three variants via prop: `default | inset | interactive`.
- `default`: `bg-surface`, `border-subtle`, `p-6`.
- `inset`: `bg-base` inside another card.
- `interactive`: hover transitions border to `--border-default` and adds `cursor-pointer`.
- Card header: title `text-md font-semibold`, optional `text-sm text-muted` subtitle on the line below, optional action button on the end side.

### 4.4 Buttons (`components/common/Button.tsx`)
- Variants: `primary | secondary | ghost | danger`.
- Sizes: `sm` (28px), `md` (32px), `lg` (40px). Default `md`.
- `primary`: `background: var(--accent); color: white;` hover `--accent-hover`.
- `secondary`: `background: var(--bg-elevated); border: 1px var(--border-default); color: var(--text-primary);`
- `ghost`: transparent, hover `var(--accent-muted)` background.
- `danger`: `var(--danger)` background.
- All buttons: 6px radius, 12px horizontal padding (`md`), 500 weight, 13px text.
- Loading state: replace label with a 14px spinner of the same color, **disable** the button.

### 4.5 Inputs
- 32px tall (`md`), 8px horizontal padding, 6px radius, `1px var(--border-default)`. On focus: `border-color: var(--accent); outline: 2px var(--accent) at 2px offset;`.
- Currency input: prefix the symbol (₪ / $) inside the input with 8px gap, muted color, non-editable.
- Number input: tabular-nums, end-aligned numbers in RTL, start-aligned in LTR.

### 4.6 Tables (Universe Browser, Audit Trail, Holdings)
- No vertical borders between cells. **Horizontal `1px var(--border-subtle)`** between rows only.
- Header row: `text-xs uppercase tracking-wider text-muted font-medium`, 36px tall.
- Body row: 40px tall, `text-sm`, hover `bg-elevated`.
- Numeric columns: end-aligned, `tabular-nums`, monospace for tickers.
- Sortable columns: chevron icon next to label, 12px, muted.

### 4.7 Badges (Valuation, Sector caps)
- 20px tall, 6px horizontal padding, full radius pill.
- `text-xs font-medium`. Background: `color + 12% alpha`; text: the color at full saturation.
- Examples: Cheap → success, Fair → muted neutral (`text-muted` on `bg-elevated`), Expensive → warning, Hard cap breach → danger.

### 4.8 Charts (DriftChart, SectorBar)
- Restyle Recharts: remove default grids; keep one `1px var(--border-subtle)` baseline.
- Axis text `text-xs text-muted tabular-nums`.
- Bars: 24px tall in DriftChart. Single accent color for in-band; semantic colors (success/warning) for over/under. **No gradients on bars.**
- Tooltip: card-styled (`bg-elevated`, 1px border, 6px radius, 12px padding).

### 4.9 Empty states
- 240px min-height, centered. Soft icon (32px, `text-muted`), `text-md font-medium` headline, `text-sm text-muted` body, optional primary CTA.

### 4.10 Toasts
- Bottom-end position. `bg-elevated`, 1px border, 8px radius, 14px padding. Auto-dismiss 4s. **Never** dismiss success toasts about money actions automatically — those need explicit acknowledge.

---

## 5. RTL / Hebrew rules (re-check on every component)

- `<html dir="rtl">` flips the entire layout via logical properties — **do not** add manual `transform: scaleX(-1)`.
- Numbers in Hebrew context still read LTR. Wrap numbers with `<bdi>` or use `dir="ltr"` on the number span if mixed-script lines look broken.
- Currency: in Hebrew, `₪1,000` is correct (symbol before number, both LTR-direction inside an RTL paragraph). `Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' })` handles this.
- Test every component with `lang="he" dir="rtl"` AND `lang="en" dir="ltr"`. Add a Storybook story or a dev-only `?dir=rtl&lang=he` toggle for QA.
- Heebo at weight 400/500/600 only. Heebo's tabular-nums quality is good — verify visually.

---

## 6. Phased Execution Plan

Work in branches. One PR per phase. **Stop and show me a diff summary at the end of each phase.**

### Phase 1 — Foundation (branch: `feat/ui-1-tokens`)
1. Create `frontend/src/styles/tokens.css` with the variables from §3.1.
2. Update `tailwind.config.ts` to expose tokens as Tailwind colors (`bg-surface`, `text-muted`, `border-subtle`, etc.) and to add the `tnum`, font-family, and motion utilities.
3. Create `frontend/src/store/themeStore.ts` (Zustand) — `theme: 'dark' | 'light' | 'system'`, persisted to `localStorage`. Effect that sets `data-theme` on `<html>` and respects `prefers-color-scheme` when `system`.
4. Add Inter Variable + Heebo Variable + Geist Mono via `@fontsource-variable/*` packages (no CDN — local). Wire weights 400/500/600 only.
5. Create `docs/DECISIONS/0001-ui-system-linear.md` documenting the system and the deviation from the PRD's original color list.
6. Run: `npm run typecheck && npm run lint && npm run test`. All green.

**Acceptance:** repo compiles, theme toggle works, `data-theme="light"` and `data-theme="dark"` both render the unchanged old UI but with new background colors. No visible regressions yet.

### Phase 2 — Primitives (branch: `feat/ui-2-primitives`)
Rewrite these so every other component inherits the new system:
- `components/common/Button.tsx`
- `components/common/Input.tsx`
- `components/common/Select.tsx` (use Radix Select underneath)
- `components/common/Card.tsx`
- `components/common/Badge.tsx`
- `components/common/Modal.tsx` (use Radix Dialog)
- `components/common/Tooltip.tsx` (Radix)
- `components/common/Toast.tsx` (Radix Toast or `sonner` — keep it light)
- `components/common/Tabs.tsx` (Radix)
- `components/common/EmptyState.tsx`
- `components/common/LoadingSpinner.tsx`
- `components/common/Skeleton.tsx` — solid-block, no shimmer.

Co-locate a `<Component>.stories.tsx` if Storybook is configured. Otherwise add a `/dev/components` route that renders all primitives in both themes and both directions for visual QA.

**Acceptance:** every primitive renders correctly in 4 modes (light LTR, light RTL, dark LTR, dark RTL). Take 4 screenshots; commit them under `docs/screenshots/phase-2/`.

### Phase 3 — App shell (branch: `feat/ui-3-shell`)
- New `Sidebar.tsx` per §4.1.
- New top bar component used by every page.
- New `Layout.tsx` wiring shell + outlet.
- Keyboard: `Cmd/Ctrl+K` opens bucket selector (use `cmdk`). `Cmd/Ctrl+\` toggles sidebar.

**Acceptance:** all existing pages still load; navigation works; RTL flip is pixel-correct; sidebar collapse persists.

### Phase 4 — Dashboard (branch: `feat/ui-4-dashboard`)
The flagship page. Apply the system to:
- Bucket header (active bucket, total value, total return, progress to goal) — 4 stat cells in a single card, divided by `1px var(--border-subtle)` verticals.
- DriftChart restyled per §4.8.
- Status strip (valuation per holding) using the new Badge.
- Sector snapshot card using `SectorExposure` from `Sector_Analysis_Module.md` — restyle bars with the new tokens.
- Next-deposit reminder as a thin info card at the bottom.

**Acceptance:** page matches the Dashboard described in PRD §8.2 visually, but in the new system. No live tickers added. No animations on numbers.

### Phase 5 — Remaining pages (branch: `feat/ui-5-pages`)
In order: Buckets → SmartDeposit → UniverseBrowser → Architect → Sectors → Drawdown → AuditTrail → Settings.

For each page: only a styling pass — do not change the logic, the API calls, the validation, or the i18n keys. If you find a bug in logic, log it in `docs/UI_REDESIGN_FOLLOWUPS.md` and keep moving.

The Architect 5-step wizard especially needs love: each step gets a number indicator on the start side, title in the middle, an inactive/active/completed visual state. Stepper is sticky at top of page content.

**Acceptance:** every page renders correctly in 4 modes. No console errors. `npm run lint` clean.

### Phase 6 — Polish & verify (branch: `feat/ui-6-polish`)
1. Run axe DevTools on every page in both themes. Fix all violations.
2. Lighthouse: aim for ≥ 95 on Performance and Accessibility on the Dashboard page. Bundle size must not increase by more than 40KB gzipped over baseline.
3. Add a `frontend/src/components/__visual__/` folder of full-page screenshots in 4 modes for the 8 main pages. Commit them.
4. Update the README's screenshot.
5. Final `npm run typecheck && npm run lint && npm run test && npm run build` — all green.

---

## 7. Definition of Done

Mark a phase complete only if **every** box is checked:

- [ ] All four modes render correctly (light/dark × LTR/RTL).
- [ ] No hardcoded colors. Every color comes from a token.
- [ ] No hardcoded strings. Every label goes through i18next.
- [ ] No `ml-`/`mr-`. Only logical properties.
- [ ] Every interactive element has a visible `:focus-visible` ring.
- [ ] All numbers use `tabular-nums` and `Intl.NumberFormat`.
- [ ] All tickers use the mono font.
- [ ] No `expected_return`, no live price updates, no number tweens, no flashing introduced.
- [ ] `prefers-reduced-motion: reduce` disables all transitions.
- [ ] `npm run typecheck` clean.
- [ ] `npm run lint` clean.
- [ ] `npm run test` clean.
- [ ] `npm run build` clean and bundle size delta ≤ +40KB gzipped.
- [ ] Screenshots committed under `docs/screenshots/phase-N/`.
- [ ] Diff summary posted to me before merge.

---

## 8. Anti-patterns — call these out and refuse them

If you (Claude Code) catch yourself reaching for any of these, stop and ask me:

- Adding a hero "portfolio is up today!" banner.
- Adding a sparkline of daily portfolio value.
- Adding a "performance vs S&P" comparison chart.
- Adding `Framer Motion` to entrance-animate cards on Dashboard.
- Adding gradient borders or glassmorphism `backdrop-filter: blur()` on cards. (Linear does not glassmorph. Stick to the borders rule.)
- Adding any color outside the token set.
- Adding any font outside Inter / Heebo / Geist Mono.
- Putting numbers inside `<motion.span>` or any counter library.

---

## 9. When in doubt

Reread §3 and §4 of the **PRD** (`MASTER_PRD.md`) and §3.5 of this brief. If something in this brief contradicts the PRD's *strategy* (the "what we don't do" list), the PRD wins. If something in this brief contradicts the PRD's *original visual styling* (colors, specific Tailwind utilities), this brief wins — that's the whole point of the redesign.

Ask me before:
- Adding a dependency.
- Touching the backend.
- Changing any i18n key (not value — *key*).
- Skipping a phase or merging phases.

---

**Begin with §1 (read & summarize). Wait for my "go" before Phase 1.**
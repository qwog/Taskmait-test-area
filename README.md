# PourGuard

A Next.js 14 PWA for concrete contractors doing residential and commercial flatwork. Prevents bad pours through an auditable rules engine grounded in ACI standards, logs pour-day events, and generates branded QC PDFs.

## Status

- **Phase 1 — core engine: complete.** 70 unit + integration tests passing.
- **Phase 2 — application layer: scaffolded.** UI routes, auth, PDF, Stripe, PWA wired up. Needs live Supabase/Stripe environments to run end-to-end.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in credentials
npm run test                 # run rule + engine tests
npm run dev                  # http://localhost:3000
```

### Required environment

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | server only — used by webhooks and PDF writes |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Billing |
| `NWS_USER_AGENT` | NWS requires a descriptive UA — include a contact email |

### Supabase setup

1. `supabase init && supabase start`
2. Apply migrations in order: `db/migrations/0001_init.sql`, then `0002_rls.sql`.
3. Create a Storage bucket named `pours` (public for now; tighten policies for production).

## Repository layout

```
app/
  (auth)/          login, signup
  (field)/         glove-friendly foreman UI (dark, huge taps)
  (office)/        desktop PM UI (dashboard, jobs, pours, mixes…)
  api/             rules/evaluate, weather, pours/[id]/pdf, stripe/webhooks
components/field/  BigButton, StatusLight, TestSlider, PhotoCapture, …
lib/
  rules/           types · menzel · catalog · engine  (Phase 1 core)
  weather/         NWS proxy + forecast filtering
  supabase/        server/client/service clients + row types
  pdf/             QcRecord renderer
  offline/         IndexedDB queue for offline log events
db/migrations/     01_init.sql, 02_rls.sql
e2e/               Playwright smoke tests
```

## The rules engine

Twelve rules live in `lib/rules/catalog.ts`, every one citing its ACI source. The engine:

- Pre-computes the Menzel evaporation rate once per evaluation and injects it into the context.
- Silently skips rules whose inputs aren't present, so a partial pre-pour context and a live pour-day event both use the same code path.
- Writes every evaluation (triggered or not) to `rule_evaluations` — an **append-only** audit trail, protected by RLS that permits `INSERT` and `SELECT` but not `UPDATE`/`DELETE`.

Severity aggregation: any `red` → `red`; else any `yellow` → `yellow`; else `green`.

### Adding a new rule — runbook

1. Pick an `id` in `SCREAMING_SNAKE_CASE`; bump `version` semantically on every published change.
2. Add the rule object to `RULE_CATALOG` in `lib/rules/catalog.ts`. Fields:
   - `citation` — always reference a published ACI (or PCA/MCA) document; leave the section number in.
   - `inputs` — list only the context keys you *actually* read in `evaluate`. The engine skips a rule if any listed input is `undefined`.
   - `evaluate(ctx)` — return `{ triggered, severity, message, mitigation? }`. Use the `ok()` helper when nothing fires.
3. Write **at least three tests** in `lib/rules/catalog.test.ts`: below threshold, at threshold, above threshold. If the rule depends on `curePlan` or `forecastCureWindow`, add a fixture.
4. Run `npm run test`. All rule tests must stay green before merging.
5. Rules are versioned individually so old `rule_evaluations` rows remain interpretable. Never retroactively rewrite a rule's behavior without bumping the version.

### Menzel formula units note

The classic ACI 305R-20 coefficient `0.44` assumes vapor pressure in **inches of Hg** and evaporation rate in **lb/ft²/hr**. `saturationVaporPressure` returns **mmHg** (common thermodynamic unit); `menzelEvaporationRate` divides internally by 25.4 before applying the coefficient. Tests confirm the full pipeline lands on the ACI 305R-20 Fig. 2.1 warning threshold (0.2 lb/ft²/hr) for a 90 °F / 40 % RH / 10 mph pour.

## Field mode constraints

- Minimum tap target 64px (primary 80px, tiles 120px).
- Minimum font 18px body / 24px action / 48px+ status.
- High-contrast palette only. Dark mode enforced via `field-root` class.
- "Exit Field Mode" requires a 2-second long-press — crews bump phones on dusty surfaces.
- Connection status visible in the header; `lib/offline/queue.ts` persists log events to IndexedDB when offline and flushes on `window.online`.

## Legal disclaimer

Every PDF and every red-override screen includes the full disclaimer from `lib/legal.ts`:

> PourGuard provides decision support based on ACI standards and user-provided data. It is not a substitute for professional engineering judgment. The contractor remains solely responsible for all placement, finishing, and cure decisions. Rule citations reference published ACI documents; consult the originals for authoritative guidance.

## Testing

- `npm run test` — Vitest unit + integration (70 tests, ~500ms).
- `npm run test:e2e` — Playwright (skeleton; seed Supabase first).
- `npm run typecheck` — strict TypeScript.

## Non-goals for v1

OCR for batch tickets, Bluetooth weather meters, SMS, in-app messaging, multi-org users, marketplace, structural concrete rules, shotcrete/stucco, maturity meters, insurance integrations.

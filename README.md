# PourGuard

Phase 1-focused implementation of PourGuard with:

- Supabase SQL migration and org-scoped RLS
- ACI-grounded rule catalog (12 rules)
- Menzel evaporation formula implementation
- Rules engine with append-only `rule_evaluations`
- NWS weather proxy route
- `/api/rules/evaluate` endpoint
- Unit/integration tests for core engine

## Environment variables

See `.env.example` values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NWS_USER_AGENT=PourGuard/1.0 (contact@pourguard.app)`

## Run

```bash
npm install
npm test
```

## Add a new rule runbook

1. Add a new rule object in `lib/rules/catalog.ts` with unique `id`, semantic `version`, citation, and mitigation guidance.
2. Extend `RuleContext` if new data is required in `lib/rules/types.ts`.
3. Add at least three tests (below/at/above threshold) in `tests/rules.test.ts`.
4. Ensure `evaluatePrePour` or `evaluateLiveEvent` supplies required inputs.
5. Validate `npm test` passes and inspect inserted `rule_evaluations` for auditability.

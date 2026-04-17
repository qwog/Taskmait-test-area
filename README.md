# PlateKarma Monorepo

Production scaffold for **PlateKarma — Thumb a Plate**, a lightweight social driving game.

## Structure

- `app/` Flutter mobile app.
- `backend/` Supabase schema, seeds, and edge functions.
- `admin/` Next.js moderation dashboard.
- `marketing/` Next.js landing site.
- `docs/` legal drafts, launch checklist, store listings, and risk register.
- `.github/workflows/` CI/CD entrypoints.

## Development order

This repo currently implements **Step 14.1** from the product build order:

1. Repo scaffold
2. CI/CD starter workflow
3. Supabase schema migration
4. Seed data for reasons and badges

Subsequent steps should be implemented in the strict sequence defined in the product brief.

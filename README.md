# Localendar CRM (Production-Minded MVP Scaffold)

This repository contains a lightweight CRM starter built for Localendar ad sales workflows.

## Stack
- Next.js + TypeScript + Tailwind CSS
- Prisma ORM + Postgres-compatible schema (SQLite local dev)
- Zod validation primitives

## Included MVP Foundation
- App shell with sidebar and global search/create header
- Route structure for dashboard + all core modules
- Prisma schema covering users, CRM entities, inventory, issues, ad sales, tasks, activities, notes, pipeline stages
- Business rule foundation: unique `issueId + inventorySlotId` prevents duplicate slot booking
- Seed script with realistic local business sample data and 3 issues

## Quick Start
1. `cp .env.example .env`
2. `npm install`
3. `npx prisma migrate dev --name init`
4. `npm run prisma:seed`
5. `npm run dev`

## Build Phasing
- Phase 1: auth + base entities (leads, companies, contacts)
- Phase 2: deals pipeline + tasks + dashboard widgets
- Phase 3: products + inventory + issues + ad sales workflows
- Phase 4: reports + permissions + UX polish

## Notes
This is intentionally lightweight and opinionated for a small sales team. It is designed for fast iteration while preserving a clean domain model.

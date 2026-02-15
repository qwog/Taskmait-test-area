# SaaS Spend Optimizer (MVP)

A lightweight web app concept for business owners to track SaaS spending by tool and receive an instant optimization assessment.

## What it does
- Captures SaaS tool details:
  - Tool name
  - Number of seats
  - Cost per user
  - Contract term (monthly/annual/multi-year)
  - Category and usage level
- Calculates spend totals and annualized costs.
- Surfaces potential overpayment indicators based on simple heuristics.
- Suggests practical next-step options (consolidation, seat-rightsizing, annual negotiation, alternatives).

## Run locally
```bash
python3 -m http.server 4173
```
Then open `http://localhost:4173`.

## Notes
This MVP intentionally uses transparent rules rather than opaque scoring, so owners can understand **why** a recommendation appears.

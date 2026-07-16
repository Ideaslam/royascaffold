# Roya AI Dynamo — Product Story

The narrative lives here; the structured truth lives in `map/` (verified) — this file is never verified.

Roya AI Dynamo is an AI-powered SaaS platform that turns multi-source business data into custom,
interactive dashboards automatically. Users connect a data source (CSV, Google Sheets, Shopify, Salla,
Zid, SQL Server, MongoDB Atlas, Google/Meta Ads), the platform discovers the schema, proposes a
canonical mapping with AI, syncs the data into a per-workspace OLAP store, and generates dashboards —
with no manual chart configuration.

**Shape of the system**
- **Backend** (`roya-ai-dynamo-api`, NestJS) — modular, DI-driven, controller → service → repository,
  with two contract-driven engine domains (Data Source Engine, Reporting Engine) over a neutral kernel.
- **Customer Portal** + **Admin Panel** (Angular 21 + PrimeNG), **Landing** (static Tailwind).
- **Async everywhere** — CSV analysis, schema discovery, sync, dashboard generation, PDF export, and
  cache recalculation all run on BullMQ queues; the HTTP thread never blocks on slow work.
- **Multi-tenant** — workspace-scoped collections (`ws_{slug}_*`), two-layer auth (system `UserRole`
  vs workspace `WorkspaceRole`).

For "what is implemented vs planned, and who owns each pending item", read the generated
`status.md` — never this file.

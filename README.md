# Royascaffold — AI-Control Engine v2

A blueprint that is a **queryable map**, keeps **implemented** and **planned** strictly separate,
survives a closed chat, and stays **lighter than the code**. Built on three layers:

```
LINK    /** @map EP-DATA-56 */         code annotations (IDs only)      — ground truth
MAP     project/map/**.yaml + index    the latest IMPLEMENTED truth
DELTA   project/changes/**/deltas       the PLANNED future (git-track)
```

## Layout

```
engine/                     # generic, reusable — zero product data
  flow.md                   # thin router (read this first)
  conventions.md            # stack-neutral core: universal kinds, edges, lightness, ids
  schemas/                  # the YAML language (node, module-bundle, rule, change, delta, plan, index)
  archetypes/               # structural contracts + copy-paste code skeletons
  rules/catalog.yaml        # reusable generic rules
  flows/                    # plan-change · implement-change · merge-change · reverse-engineer
  verify/                   # roya CLI (lib + index generator + verify) + checklist

project/                    # the migrated royascaff-v2 blueprint (this system's truth)
  profile.yaml              # apps, stack, id prefixes, subtypes, integrations, code_roots, size budget
  description.md            # product story (not verified)
  status.md                 # GENERATED board: implemented + backlog (features+bugs) + owners
  map/
    index.yaml              # GENERATED registry + bidirectional graph
    modules/                # ONE bundle per module (26 bundles) — thin one-line nodes + co-located pages
    architecture/           # domains, boundaries (lint), auth (two-layer roles)
    rules.yaml              # all rules, referenced by id
    operational.yaml        # queues + workers + migrations
  changes/                  # deltas + plan.yaml per change/bug
  verify/verify-report.yaml # GENERATED verify output
```

## Use it

```bash
npm install
npm run index     # regenerate map/index.yaml + status.md   (never hand-write these)
npm run verify    # freshness + links + rules + deltas + conflicts + boundaries + drift + size
npm run status    # index + verify in one go

# query the graph in any direction
node engine/verify/roya.mjs query project SVC-DATA-DS   # -> used_by, deps, methods, rules
node engine/verify/roya.mjs query project EP-DATA-56    # -> calls, used_by (pages)
```

`verify` exits non-zero unless status is **PASS**. A change is not done until it is PASS.

## Current state of the migration

**All modules migrated & verified** — `roya verify` = **PASS** (466 nodes, 0 errors). The whole
royascaff-v2 blueprint now lives as a queryable map, grouped by engine domain:

- **Engine core:** `engine-core` (neutral pipeline kernel + registries + seams), `pipelines` (step packs).
- **Data-source engine (`DOM-DATA`):** `data` (64 surfaces), `connectors` (11 sources + registry +
  interface + OAuth/DS services), `analytics-store` (OLAP engine registry + store), `pipelines`.
- **Reporting engine (`DOM-REPORTING`):** `dashboards` (full: generation, widgets, filters, templates),
  `sharing`, `export`, `templates`, `color-templates`, `projects` — depending on data via **public
  contracts only** (`IF-DATA-RESOLVER`, `SVC-OLAP-STORE`), lint-enforced by `BND-REPORTING-DATA`.
- **Platform (`DOM-PLATFORM`):** `auth`, `users`, `workspace`, `subscriptions`, `payments`,
  `notifications`, `ai-processing`, `ai-logs`, `audit`, `background-jobs`, `settings`, `admin`,
  `integration-providers`.
- **Frontend:** `frontend` (shared theme, tokens, i18n, app layouts) + `landing` (marketing site);
  each backend module co-locates its own pages/components.
- **Cross-cutting:** 4 domains, 2 enforced boundaries, two-layer auth, 44 rules (incl. performance +
  architecture rules), operational queues/migrations with honest `partial` gaps (PDF worker, template
  pipeline, OAuth login stub, DGC stub).
- **Live change demo:** `change-072` (workspace scoping) shows a field **planned, not implemented**;
  `change-073` + `bug-014` show the multi-team board and a flagged cross-plan conflict.
- **Next:** add `@map` annotations in the real repos + set `code_roots` in `profile.yaml` so the
  drift + size-budget checks activate. Follow `engine/flows/reverse-engineer.md`.

See `REVIEW-RESULT.md` for how this maps to `../review-chicklist.md`.

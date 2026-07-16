# Flow: New system from zero (greenfield) — discover → scaffold → design → build

The map is **born empty**: nothing is implemented yet, so `map/` starts empty and the whole v1 is a
**planned change program** that fills the map as phases merge. The build loop reuses the Change
lifecycle (`change.md`). `>> GATE` marks each point where a human must approve before proceeding.

## Phase 1 — Discover (planner)
Interview the human in ONE grouped batch:
1. **Product** — name · one-line promise · who uses it.
2. **Primary jobs** — the top 3–7 user outcomes.
3. **Apps & stack** — web / mobile / api / cli + framework each.
4. **Domains** — the major areas of the system.
5. **Core data** — the main entities/collections.
6. **Integrations** — external services + their secrets.
7. **Cross-cutting rules** — auth model · tenancy · perf targets · pagination · audit.
8. **Constraints** — compliance / regions / budgets / non-negotiables.

Ask only what changes a decision; **default the rest** and flag it (`# assumed:` in `profile.yaml`).

> **GATE 1 — scope approved.** Reflect the product understanding back to the human before writing anything.

## Phase 2 — Scaffold & define
1. `roya init <projectDir>` (or `npm run init`) → `profile.yaml`, `description.md`, an empty `map/`
   and a valid empty `index.yaml`. `verify` is PASS immediately (0 real nodes).
2. Fill `description.md` (Product Story, jobs, shape, constraints) and `profile.yaml`
   (`product`, `apps`, `subtypes`, `id_prefixes`, integrations) from Phase 1. Leave `code_roots: []`.

## Phase 3 — Design the architecture (as `planned`)
In `map/architecture/`: declare `DOM-` domains (`owns[]` + `contracts[]`) and `BND-` boundaries.
In `map/rules.yaml`: adopt the generic rules from `engine/rules/catalog.yaml`, then add project rules.
Pick or author the `engine/archetypes/` you will build against. Every node stays `status: planned` —
this is design, not code.

> **GATE 2 — architecture approved.** Confirm domains, boundaries, and rules before planning work.

## Phase 4 — Plan the build as a change PROGRAM
Slice v1 into ordered phases, one change folder each (`change-001-foundations`, `change-002-auth`,
`change-003-<feature>` …). For each, run **Phase 1 of `change.md`**: `change.yaml` (+ archetypes),
one delta per node with `creates: true`, and a `plan.yaml` of atomic steps. `verify` flags cross-plan
conflicts so phases stay disjoint.

> **GATE 3 — program approved.** Confirm the phase order before any code is written.

## Phase 5 — Build, phase by phase
For each phase change, run **Phases 2–3 of `change.md`** (Implement + Merge) — including their gates.
The map grows empty → full; the board always shows real implemented state vs the remaining program.

## Done when
`roya init` produced a PASS empty project, the program is planned + approved, and phase 1 is
implemented + merged so the map holds its first `implemented` nodes with a correct graph.

## Migrating an EXISTING codebase instead?
Use `reverse-engineer.md` — it starts from code, not zero.

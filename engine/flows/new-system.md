# Flow: New system from zero (greenfield) — discover → scaffold → design → build

The map is **born empty**: nothing is implemented yet, so `map/` starts empty and the whole v1 is a
**planned change program** that fills the map as phases merge. The build loop reuses the Change
lifecycle (`change.md`). `>> GATE` marks each point where a human must approve before proceeding.

## Phase 1 — Discover (planner)
Interview the human in ONE grouped batch using the reusable question blocks in
**`engine/discovery.yaml` → `new_system`** (product · jobs · apps/repos · domains · data · integrations ·
rules · constraints — each block says which file it fills). Capture the **apps/repositories** the
system ships as (e.g. backend API, customer portal, admin panel, landing) — these become
`profile.apps` and every node is later assigned to one or more. Ask only what changes a decision;
**default the rest** and flag it (`# assumed:` in `profile.yaml`).

> **GATE 1 — scope approved.** Reflect the product understanding back to the human before writing anything.

## Phase 2 — Scaffold & define
1. `roya init <projectDir>` (or `npm run init`) → `profile.yaml`, `description.md`, an empty `map/`
   and a valid empty `index.yaml`. `verify` is PASS immediately (0 real nodes).
2. Fill `description.md` (Product Story, jobs, shape, constraints) and `profile.yaml`
   (`product`, `apps` + `default_app`, `subtypes`, `id_prefixes`, `conventions`, integrations) from
   Phase 1. Leave `code_roots: []`. `roya init` writes a minimal starter; for the richer prompts use
   **`engine/templates/profile.yaml`** and **`engine/templates/description.md`** as the fill-in guide.

## Phase 3 — Design the architecture (as `planned`)
In `map/architecture/` declare `DOM-` domains (`owns[]` + `contracts[]`) and `BND-` boundaries —
copy **`engine/templates/map/architecture/domains.yaml`** and **`boundaries.yaml`**. Design the
**data model** here too: one entity per file at `map/data/<domain>/<entity>.yaml` (copy
**`engine/templates/entity.yaml`**), each with its owning `domain` and a full `spec.fields` +
`relations` — this is the shared vocabulary the modules' logic will `deps` onto. In `map/rules.yaml`
(**`engine/templates/map/rules.yaml`**) adopt the generic rules from `engine/rules/catalog.yaml`, then
add project rules. Declare any queues/migrations in `map/operational.yaml`
(**`engine/templates/map/operational.yaml`**). Pick or author the `engine/archetypes/` you will build
against. Every node stays `status: planned` — this is design, not code.

> **GATE 2 — architecture approved.** Confirm domains, boundaries, and rules before planning work.

## Phase 4 — Plan the build as a change PROGRAM
Slice v1 into ordered phases, one change folder each (`change-001-foundations`, `change-002-auth`,
`change-003-<feature>` …) — copy `engine/templates/change/` and, for modules, `templates/module-bundle.yaml`.
For each, run **Phase 1 of `change.md`**: `change.yaml` (+ archetypes),
one `creates: true` delta per node **carrying its full build `spec`** (fields, request/response,
behavior, UI states, edge cases — deviations from `profile.conventions` only), and a `plan.yaml` of
atomic steps. Because nothing is implemented yet, EVERY new node is `planned` and MUST have a spec —
`verify` warns `SPEC_MISSING` otherwise. This is where the whole system's descriptive detail lives
until code exists; at merge each spec folds onto its node in the map.

> **GATE 3 — program approved.** Confirm the phase order before any code is written.

## Phase 5 — Build, phase by phase
For each phase change, run **Phases 2–3 of `change.md`** (Implement + Merge) — including their gates.
The map grows empty → full; the board always shows real implemented state vs the remaining program.

## Done when
`roya init` produced a PASS empty project, the program is planned + approved, and phase 1 is
implemented + merged so the map holds its first `implemented` nodes with a correct graph.

## Migrating an EXISTING codebase instead?
Use `reverse-engineer.md` — it starts from code, not zero.

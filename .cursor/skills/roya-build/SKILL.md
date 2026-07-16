---
name: roya-build
description: >-
  Build or change software using the royascaffold AI-Control engine (Map + Delta
  + Link). Picks and runs the right flow — new system from zero, a change
  (feature/bug/refactor), or reverse-engineering an existing codebase — honoring
  confirmation gates, capturing a full build spec per planned artifact, and
  keeping `roya verify` PASS. Use when starting a new system, planning or
  implementing a feature or bug, or importing a codebase into the map, in a
  project that contains a royascaffold-style engine (engine/flow.md + project/map).
---

# roya-build

This project is driven by the **royascaffold** engine: a queryable YAML blueprint (`project/map/`)
that stays in sync with code, with planned work held as changes (`project/changes/`) and proven by
`roya verify`. Do not free-code around it — go through the flow.

## Step 1 — Orient (always)
1. Work from the **engine root** (folder with `package.json` + `engine/flow.md`; here `royascaffold/`).
2. Read `engine/flow.md` — the thin router (three layers, the flows, the gate rule).
3. Load only `project/map/index.yaml` (never whole modules) to find target node ids.
4. Confirm the current state: `npm run status` must be PASS before you start.

## Step 2 — Pick the flow (delegate to the matching skill, which follows the flow doc)

`roya-build` is the router. Hand off to the per-flow skill for the situation:

| Situation | Skill | Flow doc it follows |
|-----------|-------|---------------------|
| New system from zero (no code, no map) | **roya-new-system** | `engine/flows/new-system.md` |
| Add a feature / bug / refactor | **roya-change** | `engine/flows/change.md` |
| Import an existing codebase into the map | **roya-reverse-engineer** | `engine/flows/reverse-engineer.md` |

If a skill isn't loaded, read and follow its flow doc directly. Interpreting checks / querying the
map → **roya-verify**.

Reusable authoring assets the flows point to:
- **Questions:** `engine/discovery.yaml` (by target/type) — ask in one batch, default the rest.
- **Templates:** `engine/templates/` — copy `module-bundle.yaml`, or the whole `change/` folder.
- **Patterns:** `engine/archetypes/*.yaml` — the shape (rules + spec + code skeleton) for a node.
- **Contract:** `engine/schemas/*.yaml` — what `verify` enforces.

## Step 3 — Honor the confirmation gates (never skip)
Each flow pauses at `>> GATE`. State what you are about to do and get explicit human approval before:
- **plan approved** — before writing any code (planner → coder handoff),
- **ready to merge** — before mutating `project/map/`,
- (new system also: **scope approved**, **architecture approved**).
A gate is a stop, not a suggestion.

## Step 4 — Every planned artifact carries a full build spec
A `planned` (or `creates:true`) surface/logic/data/ui/feature MUST include a `spec` — fields,
request/response, method behavior, UI states, edge cases, feature narrative + acceptance — documenting
only what **deviates** from `profile.conventions`. `verify` flags `SPEC_MISSING` otherwise. This is the
build contract; a coder fills it without inventing design.

## Step 5 — Tight loop
After each atomic step (or map edit): `npm run status` + the project's build/test. Fix until PASS.
Advance `plan.yaml.current_step`. To resume after a closed chat, read `index.yaml` + the change's
`plan.yaml` — `current_step` says exactly where you stopped.

## Related skills
- **roya-new-system**, **roya-change**, **roya-reverse-engineer** — the three flow skills this router delegates to.
- **roya-verify** — command reference, the meaning of each check/error, and `roya query` / `roya effective` lookups.

---
name: roya-change
description: >-
  Plan and implement a feature, bug, or refactor with the royascaffold AI-Control
  engine — discover, plan (change.yaml + deltas carrying a full build spec +
  plan.yaml), implement (fill archetype skeletons, add @map, verify), then merge
  the deltas into the map — honoring confirmation gates. Use when adding or
  changing a feature/bug/refactor in a project with a royascaffold-style engine
  and an existing map.
---

# roya-change

Change lifecycle. **Read and follow `engine/flows/change.md` exactly** — this is the operational
summary. Run all commands from the engine root (folder with `package.json` + `engine/`). Confirm
`npm run status` is PASS before starting.

## Phase 1 — Discover & plan (planner, no code)
- Interview using `engine/discovery.yaml → change`: ask the `mandatory` blocks always, plus any whose
  `skip_when` doesn't match the change type. Default the rest → `change.yaml.assumptions[]`.
- Copy `engine/templates/change/` to `project/changes/<id>/` (next free `change-NNN` / `bug-NNN`).
- Fill `change.yaml`, the `deltas/` (**each carries a full `spec`** — deviations from
  `profile.conventions` only), and `plan.yaml` (atomic steps, `current_step: 1`).
- `npm run status`. `>> GATE plan approved` — do NOT write code before approval.

## Phase 2 — Implement (coder, ZERO design decisions)
Per step from `current_step`: read only the step's module bundle + named `archetype` + `rules`. Build
exactly the delta's `spec` (+ inherited `profile.conventions`). Add `/** @map <ID> */`. Touch only the
step's `files`. `npm run status` + build/test; fix until PASS; advance `current_step`.
`>> GATE ready to merge` — don't mutate `project/map/` before approval.

## Phase 3 — Merge
Apply each delta into `map/modules/<m>.yaml`, set `status: implemented`, append the change id to
`history[]`, archive the change folder, then `npm run index`.

## Done when
`verify` PASS, backlog no longer lists it, `status.md` matches reality. Interpreting checks → **roya-verify**.

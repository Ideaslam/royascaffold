---
name: roya-new-system
description: >-
  Build a brand-new system from zero with the royascaffold AI-Control engine —
  discover, scaffold (roya init), design the architecture, plan the build as a
  change program, then implement + merge phase by phase, honoring confirmation
  gates and a full build spec per planned node. Use when starting a greenfield
  project (no code, no map) in a project with a royascaffold-style engine.
---

# roya-new-system

Greenfield lifecycle. **Read and follow `engine/flows/new-system.md` exactly** — this is the
operational summary. Run all commands from the engine root (folder with `package.json` + `engine/`).

Preconditions: no existing map/code. If code exists → **roya-reverse-engineer**; if the map exists
and you're adding to it → **roya-change**.

## Phases (each `>> GATE` needs explicit human approval before you continue)

1. **Discover** — interview using `engine/discovery.yaml → new_system` in ONE batch; default the rest.
   `>> GATE scope approved`.
2. **Scaffold** — `node engine/verify/roya.mjs init <dir>` (or `npm run init`). `verify` is PASS
   immediately. Fill `profile.yaml` (incl. `conventions`) + `description.md` from Phase 1.
3. **Design** — declare `DOM-`/`BND-` in `map/architecture/`, adopt rules in `map/rules.yaml`, pick
   `engine/archetypes/`. Everything `status: planned`. `>> GATE architecture approved`.
4. **Plan the program** — one change folder per phase (`change-001-foundations`, …), copying
   `engine/templates/change/`. Every `creates:true` delta carries a full `spec` (fields,
   request/response, behavior, UI states, edge cases). `>> GATE program approved`.
5. **Build phase by phase** — for each phase change, run **roya-change** Phases 2–3 (implement + merge),
   including their gates. The map grows empty → full.

## Always
- Every planned node has a full `spec` (deviations from `profile.conventions` only) — else `verify`
  flags `SPEC_MISSING`.
- `npm run status` must be PASS after each step. Interpreting checks → **roya-verify**.

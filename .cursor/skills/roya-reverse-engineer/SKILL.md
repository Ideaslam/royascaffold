---
name: roya-reverse-engineer
description: >-
  Import an existing codebase into the royascaffold map — set the profile, walk
  modules into thin map bundles with honest statuses, lift architecture and
  rules, annotate code with @map, and verify to PASS. Use when onboarding a
  project or module that already has code but no royascaffold map.
---

# roya-reverse-engineer

Onboard existing code into the map. **Read and follow `engine/flows/reverse-engineer.md` exactly** —
this is the operational summary. Run all commands from the engine root (folder with `package.json` +
`engine/`).

## Steps
1. **Profile.** Fill `project/profile.yaml`: apps, stack, `id_prefixes`, `subtypes`, integrations,
   `conventions`, and `code_roots` + `map_size_budget` (so drift + size checks can run).
2. **Walk one module at a time** → `map/modules/<m>.yaml`. For each surface/logic/data/integration/
   flow add a **thin** node: id, kind, subtype, status, edges (`calls`/`deps`/`implements`), rules.
   Implemented code stays light — **no field lists** (code is the truth via `@map`).
3. **Honest status** — `implemented` for coded artifacts; `partial` (+ reason) for stubs; `planned`
   (+ `intentional_drift: true`) for documented-but-not-coded.
4. **Cross-cutting** — `map/architecture/` (domains, boundaries), `map/rules.yaml` (adopt
   `engine/rules/catalog.yaml` + project rules), `map/operational.yaml` (queues, migrations, bugs).
5. **Annotate the code** — add `/** @map <ID> */` on classes, public methods, surfaces, pages. IDs only.
6. **Generate + verify** — `npm run status`; resolve drift until PASS.

## Notes
- Only planned/created work needs a full `spec`; implemented nodes stay light.
- After onboarding, add features/bugs with **roya-change**. Interpreting checks → **roya-verify**.

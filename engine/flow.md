# Engine v2 — Flow (thin router)

This is the only prose the AI reads to orient itself. Everything else is YAML the tools verify.

## The three layers

```
LINK    code annotations  /** @map EP-DATA-56 */     ground truth in the code
MAP     project/map/**.yaml + index.yaml             the latest IMPLEMENTED truth
DELTA   project/changes/<id>/deltas + plan.yaml       the PLANNED future
```

- **Implemented view** = MAP.
- **Effective view** = MAP + open DELTAs.
- **Pending view** = open DELTAs only — "what is left to build".

## Start any task by loading only two things

1. `project/map/index.yaml` — the generated registry + graph (who calls what, status of everything).
2. The relevant `project/changes/<id>/plan.yaml` — the ordered, resumable steps.

Never read a whole module unless a step names it. The map is intentionally lighter than the code
(see `engine/conventions.md` → Lightness). Detail lives in the code, reached by the `@map` annotation.

## Pick a flow

Each flow is **end to end** — discovery is built into it, and implement + merge run inside it behind
confirmation gates. There are only three:

| You want to… | Flow |
|--------------|------|
| Start a brand-new system from zero (no code, no map) | `flows/new-system.md` |
| Add a feature / bug / refactor (discover → plan → implement → merge) | `flows/change.md` |
| Import an existing codebase into the map | `flows/reverse-engineer.md` |

## Confirmation gates (a human approves before the engine advances)

Every flow pauses at `>> GATE` boundaries. The engine states what it is about to do and waits for an
explicit human "go" before crossing:

- **plan approved** — before any code is written (planner → coder handoff).
- **ready to merge** — before the map is mutated (deltas fold into implemented truth).
- new-system adds **scope approved** and **architecture approved** up front.

A gate is a stop, not a suggestion. Nothing past a gate happens without approval.

## Authoring assets (what to reach for)

Four non-overlapping helpers under `engine/`:

| Asset | Answers | Where |
|-------|---------|-------|
| **schema** | "what MUST be true" (verify enforces it) | `schemas/*.yaml` |
| **template** | "a blank file of this type, ready to fill" | `templates/` (one per file type — see below) |
| **archetype** | "the pattern for this recurring node" (rules + spec + code skeleton) | `archetypes/*.yaml` |
| **discovery** | "what to ask the human", structured by target/type | `discovery.yaml` |

`templates/` mirrors `project/` — copy the one matching the file you're authoring:

- **Authored** (fill these): `profile.yaml`, `description.md`, `module-bundle.yaml`, `map/architecture/{domains,boundaries}.yaml`, `map/rules.yaml`, `map/operational.yaml`, and the whole `change/` (change + plan + deltas).
- **Generated** (shape reference only — never hand-write): `map/index.yaml`, `status.yaml`, `verify-report.yaml`. These are written by `roya index` / `roya verify`.

## The one rule that never bends

`roya verify` must be **PASS** before a change is considered done. It checks index freshness,
link consistency, delta targets, cross-plan conflicts, architecture boundaries, and (when code is
present) map↔code drift. If it is not PASS, the work is not finished.

## Who does what (planning ≠ implementing)

| Team | Acts | Produces |
|------|------|----------|
| Business | plan features | `changes/change-NNN/` (`owner: business`, `status: planned`) |
| Support | plan bugs | `changes/bug-NNN/` (`type: bug`, `owner: support`) |
| Developers | implement | execute `plan.yaml` steps, merge deltas → `map/`, regenerate index |

A plan can sit `planned` for months. The map keeps showing real implemented state; the board
(`project/status.md`) shows the future. Nothing lives in a chat — it all lives on disk (git).

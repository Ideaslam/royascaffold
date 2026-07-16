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

| You want to… | Flow |
|--------------|------|
| Plan a new feature or bug (no code) | `flows/plan-change.md` |
| Implement a queued change (write code) | `flows/implement-change.md` |
| Merge a finished change into the map | `flows/merge-change.md` |
| Import an existing codebase into the map | `flows/reverse-engineer.md` |

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

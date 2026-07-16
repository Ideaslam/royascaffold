# Flow: Change lifecycle — discover → plan → implement → merge

One feature, bug, or refactor, end to end. Discovery is built in. Roles: a **planner**
(business/support/dev) runs Phase 1; a **coder** (small model) runs Phase 2; a maintainer runs
Phase 3. `>> GATE` marks each point where a human must approve before the engine proceeds.

## Phase 1 — Discover & plan (planner, no code)
1. **Discover.** If the intent isn't already precise, interview the human in ONE grouped batch:
   type & owner · intent (one sentence) · targets (find them in `index.yaml`) · new-vs-modified ·
   acceptance · rules · archetype(s) · step sequence. Ask only what changes a decision; **default the
   rest** and record each as `change.yaml.assumptions[]` `{q, value, assumed: true}`. Stop as soon as
   you can write artifacts that `verify` PASS.
2. **Create** `changes/<id>/` (`change-NNN` or `bug-NNN`; next free id — verify enforces uniqueness).
3. **Write `change.yaml`** — id, title, `type`, `owner`, `status: planned`, rationale, acceptance,
   `archetypes`, `assumptions`.
4. **Write the deltas** — one file per touched node under `deltas/`: `target`, `status: planned`,
   `patch { add/remove/set }` (or `creates: true` for a new node). The map stays untouched.
5. **Write `plan.yaml`** — ordered atomic steps; each names target · archetype · files · rules · calls ·
   a one-line `accept`. `current_step: 1`, all steps `planned`.
6. `npm run index && npm run verify`. Backlog + board update; cross-plan conflicts are flagged.

> **GATE 1 — plan approved.** Show the human the change summary, step list, and any `assumed` answers.
> **Do not write code** until they approve. An approved plan may sit `planned` for months.

## Phase 2 — Implement (coder — makes ZERO design decisions)
Repeat per step, starting at `current_step`:
1. **Load only the step** — its module bundle, the named `archetype`, the referenced `rules`. Nothing else.
2. **Fill the skeleton.** The archetype gives the file shape with `{{placeholders}}`; the delta says
   exactly what to add. Touch only the `files` the step names.
3. **Annotate** the created class/method/surface/page with `/** @map <ID> */`. IDs only.
4. **Loop:** `npm run index && npm run verify` + the project's build/test. Fix until PASS.
5. **Advance:** mark the step `done`, bump `current_step`.

Resuming after a closed chat: read `index.yaml` + this `plan.yaml`; `current_step` + per-step status
tell you exactly where you stopped. No re-discovery — state is entirely on disk.

> **GATE 2 — ready to merge.** All steps `done`, code annotated, `verify` PASS. Present the diff
> summary. **Do not mutate the map** until the human approves.

## Phase 3 — Merge (the git-commit of the plan)
1. **Apply each delta into the map.** `add/remove/set` → the target node in `map/modules/<m>.yaml`;
   `creates: true` → add the node; `move/rename/reboundary` → relocate. Append the change id to the
   node's `history[]`. Set `status: implemented`.
2. **Close the change.** `change.yaml.status: implemented`, deltas `implemented`, move the folder to
   `changes/_archive/`.
3. **Regenerate + verify.** `npm run index && npm run verify`. The board shows the new truth; the
   backlog drops the item.

## Done when
`verify` PASS, the map reflects the change, the backlog no longer lists it, `status.md` matches reality.

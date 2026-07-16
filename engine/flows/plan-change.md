# Flow: Plan a change (business feature or support bug) — NO code

Planning produces files only. It is safe to do at any time, by anyone, and to leave `planned` for
months. The developer picks it up later via `implement-change.md`.

## Steps

1. **Load context.** Read `project/map/index.yaml` (never the whole map). Find the target nodes.
2. **Create the change folder.** `project/changes/change-NNN/` (or `bug-NNN/`).
   Pick the next free NNN — `verify` enforces unique, monotonic ids.
3. **Write `change.yaml`.** id, title, `type` (feature|bug|refactor), `owner` (business|support|dev),
   `status: planned`, rationale, acceptance criteria, and the `archetypes` the change will use.
4. **Write the deltas.** One file per touched node under `deltas/`. Each is a git-track patch:
   `target`, `change`, `status: planned`, `patch: { add/remove/set }` (or `creates: true` for a new node).
   The map stays untouched — this is the *planned future*, not an edit.
5. **Write `plan.yaml`.** Ordered, atomic steps. Each step names: target · archetype · files · rules ·
   calls · a one-line `accept` check. `current_step: 1`, all steps `planned`.
6. **Regenerate + verify.** `npm run index` then `npm run verify`. The backlog + board update.
   Cross-plan conflicts are flagged if another open change touches the same node.

## Done when
`verify` is PASS and `project/status.md` shows the new item in the backlog with owner + targets.

# Flow: Merge a finished change into the map — the "git-commit of the plan"

Until this runs, the change's fields are `planned` and the map shows the OLD implemented truth.
Merging is what makes the planned future become the implemented present.

## Steps

1. **Gate.** Confirm every `plan.yaml` step is `done`, code carries `@map` annotations, and
   `verify` is PASS on the effective view.
2. **Apply each delta into the map.** For every `deltas/*.yaml`:
   - `add/remove/set` → apply to the target node's fields in its `map/modules/<m>.yaml`.
   - `creates: true` → add the new node to the right bundle.
   - `move/rename/reboundary` → relocate the node (verify treats it as relocation, not delete+add).
   - Append the change id to the node's `history`.
   - Set the node's `status: implemented`.
3. **Close the change.** Set `change.yaml.status: implemented`, mark all deltas `implemented`,
   move the folder to `changes/_archive/` (history is kept; it is no longer in the backlog).
4. **Regenerate + verify.** `npm run index && npm run verify`. The board now shows the new truth and
   drops the item from the backlog.

## Done when
`verify` PASS, map reflects the change, backlog no longer lists it, `status.md` matches reality.

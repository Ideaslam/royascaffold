# Flow: Implement a queued change — write code (built for a small coder model)

The planner already did all the thinking. The coder executes one atomic step at a time and makes
**zero design decisions**.

## Steps (repeat per plan step)

1. **Load only the step.** Read `plan.yaml`, go to `current_step`. Read only: the step's module
   bundle, the named `archetype`, and the referenced `rules`. Nothing else.
2. **Fill the skeleton.** The archetype gives the exact file shape with `{{placeholders}}`. The delta
   says exactly what to add. Touch only the `files` the step names.
3. **Add the `@map <ID>` annotation** on the class / method / surface / page you created. IDs only.
4. **Run the loop.** `npm run index && npm run verify` + the project's build/test. Fix until PASS.
5. **Advance.** Mark the step `done`, bump `plan.yaml.current_step`. Move to the next step.

## Resuming after a closed chat
Read `index.yaml` + this change's `plan.yaml`. `current_step` and per-step `status` tell you exactly
where you stopped and what is next. No re-discovery — the state is entirely on disk.

## Done when
All steps `done`, code annotated, `verify` PASS. Then run `merge-change.md`.

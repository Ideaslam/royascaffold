# Flow: Reverse-engineer an existing codebase into the map

Use this to onboard a project (or a module) that already has code but no v2 map.

## Steps

1. **Set the profile.** Fill `project/profile.yaml`: apps, stack, `id_prefixes`, subtype vocabulary,
   integrations, `code_roots` (so drift + size checks can run), `map_size_budget`.
2. **Walk one module at a time.** For each module, create `map/modules/<m>.yaml`. For every
   surface / logic / data / integration / flow, add a one-line node: id, kind, subtype, status,
   edges (`calls`/`deps`/`implements`), and the rules it obeys. Keep it thin — no field lists.
3. **Set status honestly.** `implemented` for coded artifacts; `partial` (+ reason) for stubs or
   missing workers; `planned` (+ `intentional_drift: true`) for documented-but-not-coded.
4. **Lift cross-cutting structure.** `map/architecture/` (domains, boundaries, auth),
   `map/rules.yaml` (adopt from `engine/rules/catalog.yaml` + project-specific), `map/operational.yaml`
   (queues, migrations, bugs).
5. **Annotate the code.** Add `@map <ID>` to classes, public methods, surfaces, pages. IDs only.
6. **Generate + verify.** `npm run index && npm run verify`. Resolve drift until PASS.

## Done when
`verify` PASS for the module, and its nodes appear in `index.yaml` with a correct bidirectional graph.

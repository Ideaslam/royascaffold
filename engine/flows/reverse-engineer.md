# Flow: Reverse-engineer an existing codebase into the map

Use this to onboard a project (or a module) that already has code but no v2 map.

## Steps

1. **Set the profile.** Fill `project/profile.yaml` (template: **`engine/templates/profile.yaml`**): the
   `apps` list (every repo the system ships as — key, `label`, `side`, `repo`, `framework`) + `default_app`
   (the API repo), stack, `id_prefixes`, subtype vocabulary, `conventions`, integrations, `code_roots`
   (so drift + size checks can run), `map_size_budget`.
2. **Walk one module at a time.** For each module, create `map/modules/<m>.yaml` from
   **`engine/templates/module-bundle.yaml`**. For every surface / logic / integration / flow, add a
   one-line node: id, kind, subtype, status, edges (`calls`/`deps`/`implements`), and the rules it obeys.
   Keep it thin — no field lists (code is the truth; `spec` is optional for implemented nodes).
   **Assign apps:** give each **ui** node its `app` (or `apps: [..]` if shared across repos); server-side
   nodes inherit `default_app`, so only set `apps:` to override. Features/modules span the union
   automatically. **Entities are separate:** create one file per entity at
   `map/data/<domain>/<entity>.yaml` from **`engine/templates/entity.yaml`** (with its owning `domain`),
   and reference it from services via `deps: [ENT-...]`. Never redefine an entity inside a module bundle.
   **DTOs are separate too:** put request/response shapes in `map/data/dto/<module>.yaml` (template
   **`engine/templates/dto.yaml`**) and link each surface with `receives:` (body) / `returns:` (response).
   Path params + query stay inline on `spec.request`.
3. **Set status honestly.** `implemented` for coded artifacts; `partial` (+ reason) for stubs or
   missing workers; `planned` (+ `intentional_drift: true`) for documented-but-not-coded.
4. **Lift cross-cutting structure**, each from its template: `map/architecture/` domains + boundaries
   (**`engine/templates/map/architecture/{domains,boundaries}.yaml`**), `map/rules.yaml`
   (**`engine/templates/map/rules.yaml`** — adopt from `engine/rules/catalog.yaml` + project-specific),
   `map/operational.yaml` (**`engine/templates/map/operational.yaml`** — queues, migrations).
5. **Annotate the code.** Add `@map <ID>` to classes, public methods, surfaces, pages. IDs only.
6. **Generate + verify.** `npm run index && npm run verify`. Resolve drift until PASS.

## Done when
`verify` PASS for the module, and its nodes appear in `index.yaml` with a correct bidirectional graph.

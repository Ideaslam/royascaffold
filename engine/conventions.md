# Engine v2 — Conventions (generic only)

This file holds **stack-neutral** rules. Nothing product-specific (brand, provider names, guard
names, stack) lives here — that all belongs in `project/profile.yaml`. The engine hardcodes nothing.

## The stack-neutral core

Every artifact, in any language or framework, is a **node** with the same tiny shape:

```yaml
id: EP-USERS-LIST         # ID prefix is a stack-defined alias of the kind (declared in profile)
kind: surface             # one of the universal kinds below
subtype: rest.get         # free-form label declared in profile.yaml
status: implemented       # planned | partial | implemented | deferred (+ reason)
calls: [SVC-USERS.list]   # edges to other nodes (the graph)
rules: [RULE-PAG-01]      # rule IDs this node must obey
location: users/users.controller.ts:42
history: [change-056]
```

### Universal kinds (the engine only understands these)

Full short + long descriptions of every kind live in **`engine/kinds.yaml`** (the single source the
viewer renders and the module-bundle template mirrors). The table below is the quick reference.

| kind | meaning | example subtypes |
|------|---------|------------------|
| `surface` | an externally reachable entry point | `rest.get`, `graphql.query`, `cli.command`, `webhook`, `event`, `screen-route`, `section` |
| `ui` | something rendered | `page`, `component`, `layout`, `theme`, `widget` |
| `logic` | behavior with no I/O surface of its own | `service`, `use-case`, `handler`, `worker`, `function` |
| `contract` | an interface / port + DI token | `interface` |
| `data` | persisted shape | `entity`, `collection`, `table`, `model` |
| `integration` | adapter to an external provider | `oauth`, `sdk`, `client` |
| `flow` | async / scheduled work | `queue`, `worker`, `cron`, `pipeline`, `job` |
| `rule` | a constraint referenced by ID | `global`, `module`, `architecture` |
| `boundary` | an import/architecture boundary | `contract-only` |
| `domain` | an ownership zone over modules | — |
| `feature` | a user-facing grouping of nodes | — |
| `module` | a code module | — |

### Edge fields (the graph)

`calls`, `uses`, `deps`, `implements`, `renders`, `receives`, `returns`, `owns`, `contracts`. Edges
may be method-level (`SVC-DATA-DS.listLite`). `roya verify` resolves every edge to a real node; the
index builds the reverse direction (`used_by`, `implemented_by`) automatically. `receives`/`returns`
link a surface to the request/response DTO shapes it consumes and produces.

### Where the map lives (file layout)

| Path | Holds |
|------|-------|
| `map/modules/<module>.yaml` | one bundle per module: its features + logic/surface/ui/contract/dto/flow nodes |
| `map/data/<domain>/<entity>.yaml` | **one entity per file** — the shared data model (see below) |
| `map/architecture/` | domains, boundaries, auth |
| `map/operational.yaml`, `map/rules.yaml` | flows/integrations, rules |
| `map/index.yaml` | generated registry + graph (never hand-edit) |

### Apps & repositories (which repo a node ships in)

`profile.yaml → apps` lists every deliverable app/repository (key, `label`, `side`, `repo`,
`framework`). Every **implementation node** is assigned to one or more of them:

- **UI nodes** carry `app: <key>` (or `apps: [<key>, ...]` when a shared asset — e.g. a theme — ships
  in several frontend repos).
- **Server-side nodes** (`surface`/`logic`/`contract`/`data`/`integration`/`flow`) **default** to
  `profile.default_app` (the API repo); set `apps:` only to override.
- **Features and modules** are *aggregates* — the engine computes their apps as the **union** of their
  members' apps, so a module naturally shows it spans (say) `backend` + `customer-portal`. Never set
  `apps` on a feature or module.

`verify` fails on an unknown app key (`APP_UNKNOWN`) and warns on a UI node with no app
(`APP_UNASSIGNED`). The viewer renders an **Apps** view — pick an app to see its whole tree (modules →
nodes by kind), and every node/module page shows the repos it ships in.

### Endpoint request & response (params · query · body · DTOs)

An endpoint's I/O is visible without opening code:

- **Path params** are auto-derived from the `route` string (`:id`, `{id}`) — you only list them under
  `spec.request.params` to add a type or note.
- **Query string** goes in `spec.request.query` (`[{name, type, required}]`); pagination and the
  success/error envelope are inherited from `profile.conventions`, so document them only when they
  **deviate**.
- **Request body** and **response body** are structured shapes → represented as **DTO nodes**
  (`kind: data, subtype: dto`) carrying `spec.fields`, linked from the surface via the `receives:`
  (request) and `returns:` (response) edges. When the response *is* an entity, point `returns:` at the
  `ENT-` id directly — don't wrap it in a DTO.

DTOs are **module-owned** and live in `map/data/dto/<module>.yaml` (a `nodes:` list under a file-level
`module:`). `verify` warns `IO_UNDOCUMENTED` when a *planned* endpoint declares no `returns`/response.
The viewer renders a **Request & Response** panel on every endpoint page and lists DTOs (grouped by
module) in the Data Model view.

### Entities & the data model

Entities (`kind: data`, subtype `entity`/`collection`) are **not owned by a module** — many modules
read and write the same entity. So each entity is its **own file** at `map/data/<domain>/<entity>.yaml`
and carries a **`domain`** (its owner, which drives boundary checks) instead of a `module`. A module
"uses" an entity through its logic **`deps: [ENT-...]`**; the viewer derives each module's *Entities
used* list from those deps, and the *Data Model* view groups all entities by domain. DTOs
(subtype `dto`) are endpoint-specific and stay in their module bundle, linked from a surface via
`receives`/`returns`. Copy `engine/templates/entity.yaml` to add a new entity.

## ID governance

- Prefix = a readable alias of the `kind`, declared in `profile.yaml.id_prefixes`.
- Format `PREFIX-{MODULE}-{NN}` for per-module artifacts (e.g. `EP-DATA-56`), `PREFIX-{NAME}` for
  cross-cutting ones (e.g. `RULE-PAG-01`, `IF-DATA-DS`).
- IDs are **stable and unique** — never reused, never renumbered. `verify` fails on duplicates.

## Descriptive completeness with zero duplication (the `spec`)

The blueprint must carry **everything a coder needs to build the artifact right the first time** —
fields, request/response shapes, method behavior, UI states, edge cases, acceptance. That lives in
each node's **`spec`** block (structured YAML, not prose). The catch that keeps it light: **detail is
tied to status, and specs record only deviations.**

**Spec-by-status — the one rule:**

| Status | `spec` | Why |
|--------|--------|-----|
| `planned` | **REQUIRED, full** | no code exists yet — the spec IS the build contract; this is where a small coder gets 100% of what it needs |
| `partial` | required for the unbuilt part | the rest is in code |
| `implemented` | **optional** | code is the source of truth via `@map`; re-describing fields the code declares is the v1 drift trap — don't |
| `deferred` | keep the intent | so it can be picked up later |

**Deviation-only:** a `spec` documents a value **only when it differs** from `profile.conventions`
(route prefix, success/error envelope, pagination, auth default, UI states…). Inherited defaults are
never repeated. This is what keeps a complete blueprint from bloating.

**Per-kind spec fields** (see `schemas/node.schema.yaml → spec_by_kind`):

| kind | the spec carries |
|------|------------------|
| `data` | `fields[] {name,type,constraints,ref}` · relations · indexes · enums |
| `surface` | `route` · `auth` (deviation) · `request {params,query,body}` · `response {status,shape}` · `errors[]` |
| `logic` | `methods[] {sig, does, side_effects}` · deps |
| `ui` | `route` · `components[]` · `wires[] (EP-id → purpose)` · `guard` · `states` (deviation) |
| `feature` | `narrative` (the detailed explanation) · `rules` · `acceptance[]` · `edge_cases[]` |

So the map is **light where code exists** (implemented → thin spine + `@map`) and **fully descriptive
where it does not yet** (planned → complete spec). `verify` flags a planned/created artifact missing
its spec (`SPEC_MISSING`); `map_size_budget` guards against *unstructured duplication*, not richness.

## Status vocabulary

`planned` · `partial` (has a `reason`) · `implemented` · `deferred` (has a `reason`).
`intentional_drift: true` marks a node that is deliberately documented-but-not-coded so `verify`
does not flag it as illegal drift.

## Annotations (LINK)

Annotations carry **only the ID**: `/** @map EP-DATA-56 */`. Spec lives in YAML, behavior in code.
Annotate: classes, public methods, surfaces (endpoints/handlers), and UI pages/components. Skip
private helpers. This keeps a simple change simple and prevents YAML↔prose↔code triple-drift.

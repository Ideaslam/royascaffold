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

`calls`, `uses`, `deps`, `implements`, `renders`, `owns`, `contracts`. Edges may be method-level
(`SVC-DATA-DS.listLite`). `roya verify` resolves every edge to a real node; the index builds the
reverse direction (`used_by`, `implemented_by`) automatically.

## ID governance

- Prefix = a readable alias of the `kind`, declared in `profile.yaml.id_prefixes`.
- Format `PREFIX-{MODULE}-{NN}` for per-module artifacts (e.g. `EP-DATA-56`), `PREFIX-{NAME}` for
  cross-cutting ones (e.g. `RULE-PAG-01`, `IF-DATA-DS`).
- IDs are **stable and unique** — never reused, never renumbered. `verify` fails on duplicates.

## Lightness (the map is smaller than the code)

**The map records only what the code cannot express.** It never re-describes what code already says.

| The map HOLDS | The map OMITS |
|---------------|---------------|
| identity + stable ID + kind | field lists, DTO/param shapes |
| edges (calls/uses/deps) — the graph | method bodies / signatures |
| status (+ reason) & history | implementation detail |
| intent (module, feature, boundary) | anything `@map` can point to |

Enforced by: one node-bundle per module (never one file per method), `@map` annotations for detail,
and a `map_size_budget` in the profile that `verify` checks against the annotated code.

## Status vocabulary

`planned` · `partial` (has a `reason`) · `implemented` · `deferred` (has a `reason`).
`intentional_drift: true` marks a node that is deliberately documented-but-not-coded so `verify`
does not flag it as illegal drift.

## Annotations (LINK)

Annotations carry **only the ID**: `/** @map EP-DATA-56 */`. Spec lives in YAML, behavior in code.
Annotate: classes, public methods, surfaces (endpoints/handlers), and UI pages/components. Skip
private helpers. This keeps a simple change simple and prevents YAML↔prose↔code triple-drift.

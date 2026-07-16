// Templates for `roya init` — a born-empty system that verifies PASS from minute one.
// The map starts EMPTY on purpose: nothing is implemented yet. The whole v1 is a planned
// change program (see engine/flows/new-system.md). The map fills up as changes merge.

export function scaffoldFiles() {
  return {
    'profile.yaml': `# System profile — the one home for concrete facts. The engine refers to these, never hardcodes them.
product:
  name: TODO
  summary: TODO — one line
  type: TODO   # e.g. SaaS web app · mobile app · CLI · backend service

# What the 12 universal kinds mean for THIS stack. Trim to the subtypes you actually use.
subtypes:
  surface: [rest.get, rest.post, rest.put, rest.patch, rest.delete, webhook, cli, event]
  ui: [page, screen, component, layout, theme]
  logic: [service, worker, cron, guard, registry, repository]
  contract: [interface]
  data: [entity, collection, table]
  integration: [oauth, sdk]
  flow: [queue, worker, cron, pipeline, migration]

# ID prefix -> kind. Keeps IDs readable; the engine only cares about \`kind\`.
id_prefixes:
  EP: surface
  PAGE: ui
  CMP: ui
  SVC: logic
  IF: contract
  ENT: data
  Q: flow
  MIG: flow
  RULE: rule
  BND: boundary
  DOM: domain
  FEAT: feature
  MOD: module

apps:
  - { key: TODO, type: TODO, framework: TODO }

# Set once code exists so map<->code drift + size-budget checks activate.
code_roots: []
map_size_budget: 0.25
`,

    'description.md': `# TODO Product — Product Story

The narrative lives here; the structured truth lives in \`map/\` (verified) — this file is never verified.
Fill it from the discovery interview (engine/flows/new-system.md, Phase 1).

One paragraph: what this product is, who it serves, and the core promise.

## Primary jobs
- TODO (top 3–7 user outcomes; each may seed a FEAT- node)

## Shape of the system
- **Apps** — TODO (web / mobile / api / cli + framework each → profile.apps)
- **Domains** — TODO (major areas → DOM- nodes in map/architecture/domains.yaml)
- **Core data** — TODO (main entities/collections → ENT- nodes)
- **Integrations** — TODO (external services + secrets → profile.integrations)

## Constraints & cross-cutting rules
- TODO (auth model, tenancy, perf targets, compliance → map/rules.yaml)

For "what is implemented vs planned, and who owns each pending item", read the generated
\`status.md\` — never this file.
`,

    'map/architecture/domains.yaml': `# Architectural domains — top-level ownership. Each domain owns modules and exposes contracts.
# Start planned; flip to implemented as the modules under it land.
nodes:
  - { id: DOM-CORE, kind: domain, name: core, status: planned, owns: [], contracts: [] }
`,

    'map/architecture/boundaries.yaml': `# Import/architecture boundaries. verify lint-checks these: a cross-domain edge must target a
# contract the other domain exposes, never its internals.
nodes: []
`,

    'map/rules.yaml': `# Project rules. Adopt the generic ones from engine/rules/catalog.yaml, then add project-specific.
# Reference rules by ID from nodes (rules: [RULE-...]); verify flags any dangling reference.
rules: []
`,

    'map/operational.yaml': `# Small operational nodes: queues, migrations, bugs.
nodes: []
`,

    'map/modules/.gitkeep': `# One bundle per module lands here as it is planned + implemented (map/modules/<module>.yaml).
`,

    'changes/.gitkeep': `# One folder per planned change: change-NNN/ (feature|refactor) or bug-NNN/. Empty until you plan v1.
`,
  };
}

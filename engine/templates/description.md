# <Product> — Product Story

The narrative lives here; the structured truth lives in `map/` (verified) — this file is never verified.
Fill it from discovery (engine/discovery.yaml → new_system).

<One paragraph: what the product is, who it serves, and the core promise.>

## Primary jobs
- <top user outcome — may seed a FEAT- node>

## Shape of the system
- **Apps** — <web / mobile / api / cli + framework each → profile.apps>
- **Domains** — <major areas → DOM- nodes in map/architecture/domains.yaml>
- **Core data** — <main entities/collections → ENT- nodes>
- **Integrations** — <external services + secrets → profile.integrations>

## Constraints & cross-cutting rules
- <auth model · tenancy · perf targets · compliance → map/rules.yaml + profile.conventions>

For "what is implemented vs planned, and who owns each pending item", read the generated
`status.md` / `status.yaml` — never this file.

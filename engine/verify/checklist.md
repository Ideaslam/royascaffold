# Shared verify checklist (what `roya verify` proves for you)

You no longer run these by hand — `roya verify` does. This is what a PASS means.

- [ ] **Index fresh** — `index.yaml.source_hash` matches the live map (else STALE).
- [ ] **Kinds & status valid** — every node has a universal kind and a valid status (+ reason if partial/deferred).
- [ ] **Links resolve** — every `calls/uses/deps/implements` target is a real node; method links exist.
- [ ] **Rules resolve** — every referenced rule id exists in `map/rules.yaml`.
- [ ] **Delta targets resolve** — every delta patches a real node (or declares `creates: true`).
- [ ] **No cross-plan collision** — two open changes touching the same node are flagged.
- [ ] **Boundaries hold** — no cross-domain import of internals (contract-only).
- [ ] **No map↔code drift** — every `@map` id has a node; every implemented node is annotated (when code_roots set).
- [ ] **Size budget** — the map stays under its configured fraction of the annotated code.

Report: `project/verify/verify-report.yaml` → `PASS | STALE | DRIFT | FAIL` with a per-item list.

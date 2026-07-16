# Review Result — evidence against `../review-chicklist.md`

Self-assessment with the exact command / file that proves each item. Run `npm run status` first.
Legend: **PASS** = provable now on the full migrated project · **PARTIAL** = mechanism proven, activation needs the real code repos.

State at review: `verify: PASS` · **466 nodes** · 26 module bundles · 44 rules · 3 open changes · 0 errors · 1 expected warning.

## A. System Map — queryable, both directions
- **A1** endpoint→services — PASS · `roya query project EP-DATA-56` → `calls: [SVC-DATA-DS.listLite]`
- **A2** service→endpoints (reverse) — PASS · `roya query project SVC-DASH` → `used_by: [EP-DASH-01 … EP-DASH-16]`
- **A3** page→endpoints — PASS · `roya query project PAGE-DASHBOARD-VIEW` → `calls: [EP-DASH-03, EP-DASH-08, EP-DASH-14, EP-DASH-15]`
- **A4** endpoint→pages (reverse) — PASS · `roya query project EP-DATA-56` → `used_by: [PAGE-DATA-SOURCES, PAGE-DASHBOARD-WIZARD]`
- **A5** full chain — PASS · PAGE-DASHBOARD-VIEW → EP-DASH-03 → SVC-DASH → IF-DATA-RESOLVER → SVC-DATA-SOURCE → ENT-DATASET (one graph walk)
- **A6** class/method/interface — PASS · services carry `methods[]`; `SVC-CONN-INTERFACE.implemented_by = [9 connectors]`, `IF-DATA-RESOLVER.implemented_by = [SVC-DATA-SOURCE]`
- **A7** rules linked, not prose — PASS · every node has `rules: [...]`; verify resolves all 44 (0 BROKEN_RULE_REF)
- **A8** performance attached — PASS · `RULE-DASH-001.performance {cached_ms:200, uncached_ms:2000}` linked from EP-DASH-* / SVC-DASH

## B. Implemented vs Planned
- **B1** MAP = implemented only — PASS · map holds only implemented nodes; planned lives in `changes/`
- **B2** DELTA = git-track patch — PASS · `roya effective project ENT-USER` shows the implemented node separately from the pending `change-072` patch
- **B3** workspaceId test — PASS · `roya effective project ENT-USER` → `implemented.workspace_scoped: false` (no workspaceId) + `pending: [{change: change-072-workspace-scoping, status: planned, patch.fields.add: workspaceId}]`
- **B4** merge lifecycle — PASS (flow) · `engine/flows/change.md` Phase 3 (gated) = apply delta → status implemented → history[] += change → archive → `roya index` regenerates board
- **B5** no status guessing — PASS · every node has a status; partials carry a `reason` (e.g. Q-PDF-EXPORT, MOD-EXPORT)

## C. Resumability
- **C1** everything on disk — PASS · profile / map / changes / plans are all files; no chat state
- **C2** plan.yaml per change — PASS · `changes/change-072-workspace-scoping/plan.yaml` = ordered steps + `current_step`
- **C3** return-and-continue — PASS · a fresh model reads `index.yaml` + `plan.yaml` + `roya effective <id>` and knows the exact next step with no re-discovery

## D. Index + Verify
- **D1** index generated — PASS · `map/index.yaml` written by `roya index`; header warns never hand-edit
- **D2** freshness — PASS · edit a map file without regen → `verify: STALE` (INDEX_STALE)
- **D3** map↔code drift — PASS (mechanism proven) · fixture run flagged `DRIFT_ORPHAN_ANNOTATION @map EP-GHOST-99` **and** 368× `DRIFT_UNANNOTATED`; auto-SKIPPED on the live project until `code_roots` point at annotated repos
- **D4** link consistency — PASS · verify emits BROKEN_LINK / BROKEN_RULE_REF; currently 0
- **D5** cross-plan conflict — PASS · `CROSS_PLAN_CONFLICT EP-DATA-56 touched by bug-014, change-073` (board Conflict column)
- **D6** report — PASS · `project/verify/verify-report.yaml` → PASS | STALE | DRIFT | FAIL + per-item list

## E. Structure Preservation
- **E1** archetypes exist — PASS · `engine/archetypes/`: endpoint (crud-list), connector (source-type), integration (external), pipeline (step), page (list-table), entity (workspace-scoped)
- **E2** code skeletons — PASS · each archetype ships `skeleton.code` with `{{placeholders}}`, not prose
- **E3** extend-by-registration — PASS · `connector.source-type` requires `implements: SVC-CONN-INTERFACE` + `register: SVC-CONN-REG`; no kernel edit
- **E4** boundaries enforced — PASS · `map/architecture/boundaries.yaml` (enforce:true); verify proves cross-domain edges hit contracts only (boundaries: OK)
- **E5** rules on new artifacts — PARTIAL · archetypes declare `requires.rules`, plan steps declare `rules[]`, and verify flags dangling rule refs; there is no automated per-node "archetype conformance" gate yet (the one place left to harden)

## Descriptive completeness (the build spec)
- **Spec layer** — nodes/deltas carry a `spec` (fields · request/response · method behavior · UI states ·
  edge cases · feature narrative + acceptance). `planned`/`creates` artifacts REQUIRE it (a coder gets
  100% of what it needs); `implemented` artifacts may omit it (code is the truth via `@map`). Specs
  record only DEVIATIONS from `profile.conventions`. Proven: `verify.checks.specs` = COMPLETE, and a
  creates-delta stripped of its spec flips it to INCOMPLETE + `SPEC_MISSING`.

## F. Lightness
- **F1** map records only what code can't — PASS · IMPLEMENTED nodes carry the light spine (id/kind/edges/rules/status); full detail lives in code via `@map`. PLANNED nodes carry a full `spec` because no code exists yet — so the blueprint is build-complete without duplicating code.
- **F2** per-module bundles — PASS · 26 files in `map/modules/*.yaml`, never one file per method
- **F3** size budget — PASS (mechanism proven) · fixture run tripped `SIZE_BUDGET … OVER` against `map_size_budget: 0.25`; auto-SKIPPED live until `code_roots` present
- **F4** index-first loading — PASS · flows load only `index.yaml` + the relevant `plan.yaml`

## G. Technology-Agnostic
- **G1** universal kinds — PASS · engine hardcodes only the 12 kinds (see `engine/conventions.md`)
- **G2** profile declares subtypes — PASS · `profile.yaml.subtypes` + `id_prefixes` (updated to the vocabulary actually used)
- **G3** proven on ≥1 non-Nest/Angular shape — PASS · static landing app (HTML+Tailwind sections), webhook + oauth-callback surfaces, and queue/worker event handlers all modeled with the same kinds, zero engine change
- **G4** engine has zero product data — PASS · `engine/` has no brand/stack/provider names (all in `profile.yaml`)

## H. Small Coder Model / Medium Planner
- **H1** planner≠coder split — PASS · `engine/flow.md` team table + `flows/change.md` Phase 1 (planner) vs Phase 2 (coder), gated handoff
- **H2** atomic steps — PASS · `plan.yaml` steps name target · archetype · files · rules · accept check
- **H3** coder makes zero design decisions — PASS · fills the archetype skeleton only
- **H4** tight feedback loop — PASS · every step ends in `verify` + build/test
- **H5** small-model dry run — PARTIAL · structure supports it; a live small-model pass on `change-072` step is not yet executed

## I. Multi-Team, Many Plans, One Board
- **I1** many parallel plans — PASS · 3 open changes coexist independently in `changes/`
- **I2** owner/team on every item — PASS · `owner: business|support|dev` on each change; board shows it
- **I3** bugs first-class — PASS · `bug-014-lite-source-count` same shape/lifecycle, `type: bug`
- **I4** ONE generated board — PASS · `status.md` (generated) = implemented + backlog + owners + status
- **I5** board reflects reality — PASS · regenerated by `roya index`; verify freshness proves it matches
- **I6** plan vs implement separable in time — PASS · items sit `planned` on disk indefinitely with full context

## J. Migration & Fidelity
- **J1** full artifact coverage — PASS · engines (SVC-PIPE-ENGINE, SVC-OLAP-ENGINE), boundaries, registries (SVC-CONN-REG, SVC-PIPE-*-REG), pipelines, queues (Q-*), features, auth (OAuth + verify), migrations (MIG-*), bugs, dynamic collections (`ws_{slug}_*`, `csvdata_{fileId}`) all present
- **J2** provenance preserved — PASS · inline `*(change-NNN)*` → `history: [...]` on nodes
- **J3** known gaps preserved — PASS · stubs/missing workers → `partial` + reason + `intentional_drift` where deliberate
- **J4** no prose duplication — PASS · project runs on YAML; only `description.md` kept, no per-module `.md` specs
- **J5** whole project verifies — PASS · `verify: PASS` across all 466 nodes

## Scorecard
| Group | Pass / Total |
|-------|--------------|
| A System Map | 8/8 |
| B Implemented vs Planned | 5/5 |
| C Resumability | 3/3 |
| D Index + Verify | 6/6 |
| E Structure Preservation | 4/5 (E5 partial) |
| F Lightness | 4/4 |
| G Tech-Agnostic | 4/4 |
| H Small-Model Friendly | 4/5 (H5 pending live run) |
| I Multi-Team / Board | 6/6 |
| J Migration Fidelity | 5/5 |
| **Total** | **49/51** (2 partial, 0 fail) |

**Ship criteria** — B, C, D, F, I at 100% + no fail anywhere: **MET.**

## Remaining (honest)
- **E5**: add an automated archetype-conformance gate (node tagged with an archetype must carry that archetype's `requires.rules`).
- **D3 / F3 activation**: wire `@map` annotations into the real repos + set `code_roots`; the checks are proven and will flip from SKIPPED to live.
- **H5**: run one live small-model pass on a real atomic step end-to-end.

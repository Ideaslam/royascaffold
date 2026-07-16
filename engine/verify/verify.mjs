// verify: proves the index is fresh and the map is internally consistent.
// Emits project/verify/verify-report.yaml and returns PASS | STALE | DRIFT | FAIL.

import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import yaml from 'js-yaml';
import { loadModel, buildGraph, hashMap, effectiveOverlay, KINDS, EDGE_FIELDS } from './lib.mjs';

const STATUSES = ['planned', 'partial', 'implemented', 'deferred'];

export function verify(projectDir) {
  const model = loadModel(projectDir);
  const graph = buildGraph(model);
  const report = { status: 'PASS', checks: {}, errors: [], warnings: [] };
  const err = (msg) => report.errors.push(msg);
  const warn = (msg) => report.warnings.push(msg);

  // --- 0. Structural errors surfaced by the loader (duplicate ids/rules) ---
  for (const e of model.errors) err(e);

  // --- 1. Index freshness ---
  const indexPath = join(projectDir, 'map', 'index.yaml');
  const liveHash = hashMap(projectDir);
  if (!existsSync(indexPath)) {
    report.status = 'STALE';
    err('INDEX_MISSING map/index.yaml — run `roya index`');
  } else {
    const idx = yaml.load(readFileSync(indexPath, 'utf8')) || {};
    report.checks.freshness = idx.source_hash === liveHash ? 'FRESH' : 'STALE';
    if (idx.source_hash !== liveHash) {
      report.status = 'STALE';
      err(`INDEX_STALE map changed but index.yaml was not regenerated (expected ${liveHash})`);
    }
  }

  // --- 2. Node validity: kind + status + build-spec completeness ---
  // Descriptive completeness: a PLANNED buildable artifact must carry a full `spec` (there is no
  // code to read yet), so a coder gets everything it needs the first time. Implemented artifacts
  // delegate detail to code via @map, so a spec is optional there.
  const BUILDABLE = ['surface', 'logic', 'data', 'ui', 'feature'];
  let specOk = true;
  for (const [id, n] of model.nodes) {
    if (!KINDS.includes(n.kind)) err(`BAD_KIND ${id} has kind='${n.kind}' (not a universal kind)`);
    const s = n.status || 'implemented';
    if (!STATUSES.includes(s)) err(`BAD_STATUS ${id} has status='${s}'`);
    if ((s === 'partial' || s === 'deferred') && !n.reason) {
      warn(`NO_REASON ${id} is '${s}' without a reason`);
    }
    if (s === 'planned' && BUILDABLE.includes(n.kind) && !n.spec && !n.intentional_drift) {
      warn(`SPEC_MISSING ${id} is planned but has no build \`spec\` (a coder can't build it without one)`);
      specOk = false;
    }
  }

  // Planned NEW nodes are created by deltas — the spec must live on the creating delta.
  for (const c of model.changes) {
    if ((c.meta.status || 'planned') === 'implemented') continue;
    for (const d of c.deltas) {
      if (d.creates && (d.status || 'planned') !== 'cancelled' && !d.spec) {
        warn(`SPEC_MISSING ${c.id}: delta creates ${d.target} without a \`spec\` (the build contract)`);
        specOk = false;
      }
    }
  }
  report.checks.specs = specOk ? 'COMPLETE' : 'INCOMPLETE';

  // --- 2b. App / repository assignment: explicit keys must exist; UI must be placed somewhere ---
  const appKeys = new Set((model.profile.apps || []).map((a) => a.key));
  let appsOk = true;
  for (const [id, n] of model.nodes) {
    const explicit = Array.isArray(n.apps) ? n.apps : (n.apps || n.app ? [].concat(n.apps || n.app) : null);
    if (explicit) {
      for (const key of explicit) {
        if (!appKeys.has(key)) { err(`APP_UNKNOWN ${id} -> '${key}' (not a profile.apps key)`); appsOk = false; }
      }
    } else if (n.kind === 'ui') {
      warn(`APP_UNASSIGNED ${id} is a ui node with no app/apps (can't tell which repo it ships in)`);
    }
  }
  report.checks.apps = appsOk ? 'OK' : 'BAD';

  // --- 3. Link consistency (edges resolve; method links exist on target) ---
  let linkOk = true;
  for (const [id, n] of model.nodes) {
    for (const field of EDGE_FIELDS) {
      for (const target of n.edges[field] || []) {
        const [base, method] = String(target).split('.');
        const tnode = model.nodes.get(base);
        if (!tnode) {
          err(`BROKEN_LINK ${id}.${field} -> ${target} (no such node)`);
          linkOk = false;
          continue;
        }
        if (method && tnode.methods && !tnode.methods.includes(method)) {
          warn(`UNKNOWN_METHOD ${id}.${field} -> ${target} ('${method}' not in ${base}.methods)`);
        }
      }
    }
    // rule references must resolve
    for (const r of n.rules || []) {
      if (!model.rules.has(r)) err(`BROKEN_RULE_REF ${id} -> ${r} (no such rule)`);
    }
  }
  report.checks.links = linkOk && !report.errors.some((e) => e.startsWith('BROKEN')) ? 'OK' : 'BROKEN';

  // --- 4. Delta targets resolve (planned future points at real or newly-created nodes) ---
  for (const c of model.changes) {
    for (const d of c.deltas) {
      if (!d.target) { err(`DELTA_NO_TARGET ${d._source}`); continue; }
      const exists = model.nodes.has(String(d.target).split('.')[0]);
      if (!exists && !d.creates) {
        err(`DELTA_BROKEN_TARGET ${c.id}: ${d.target} (not in map; set creates:true if new)`);
      }
      if (d.status && !['planned', 'in_progress', 'implemented', 'cancelled'].includes(d.status)) {
        err(`DELTA_BAD_STATUS ${c.id}: ${d.target} status='${d.status}'`);
      }
    }
    // plan.yaml sanity
    if (c.plan && c.plan.steps) {
      const cur = c.plan.current_step;
      if (cur != null && !c.plan.steps.some((s) => s.id === cur)) {
        warn(`PLAN_STEP_MISSING ${c.id}: current_step ${cur} not in steps`);
      }
    }
  }

  // --- 5. Cross-plan conflict: two open changes patch the same node ---
  const targetToChanges = new Map();
  for (const c of model.changes) {
    if ((c.meta.status || 'planned') === 'implemented') continue;
    for (const d of c.deltas) {
      if (!d.target) continue;
      if (!targetToChanges.has(d.target)) targetToChanges.set(d.target, new Set());
      targetToChanges.get(d.target).add(c.id);
    }
  }
  const conflicts = [];
  for (const [target, set] of targetToChanges) {
    if (set.size > 1) conflicts.push({ target, changes: [...set] });
  }
  report.checks.conflicts = conflicts.length ? 'FOUND' : 'NONE';
  for (const cf of conflicts) warn(`CROSS_PLAN_CONFLICT ${cf.target} touched by ${cf.changes.join(', ')}`);

  // --- 6. Boundary lint (architecture): cross-domain edges must use public contracts ---
  const boundaryResult = checkBoundaries(model);
  report.checks.boundaries = boundaryResult.status;
  for (const v of boundaryResult.violations) {
    if (boundaryResult.enforce) err(`BOUNDARY_VIOLATION ${v}`);
    else warn(`BOUNDARY_VIOLATION ${v}`);
  }

  // --- 7. Map ↔ code drift (only if the profile points at real code) ---
  const codeRoots = (model.profile.code_roots || []).map((r) => join(projectDir, '..', r));
  const drift = checkDrift(model, codeRoots);
  report.checks.drift = drift.status;
  for (const m of drift.messages) (drift.hard ? err : warn)(m);

  // --- 8. Size budget: the map must stay lighter than the code it describes ---
  const budget = model.profile.map_size_budget; // fraction, e.g. 0.25
  if (budget && drift.codeBytes > 0) {
    const ratio = model.sizeBytes.map / drift.codeBytes;
    report.checks.size = ratio <= budget ? 'OK' : 'OVER';
    if (ratio > budget) warn(`SIZE_BUDGET map is ${(ratio * 100).toFixed(1)}% of code (budget ${budget * 100}%)`);
  } else {
    report.checks.size = 'SKIPPED (no code_roots configured)';
  }

  if (report.errors.length) report.status = report.status === 'STALE' ? 'STALE' : 'FAIL';
  report.summary = {
    nodes: model.nodes.size,
    rules: model.rules.size,
    changes: model.changes.length,
    errors: report.errors.length,
    warnings: report.warnings.length,
  };

  const vdir = join(projectDir, 'verify');
  if (!existsSync(vdir)) mkdirSync(vdir, { recursive: true });
  writeFileSync(join(vdir, 'verify-report.yaml'), yaml.dump(report, { lineWidth: 120, sortKeys: false }), 'utf8');
  return report;
}

function domainOfModule(model) {
  const map = new Map(); // module name -> domain id
  const contracts = new Map(); // domain id -> Set(node ids)
  for (const [, n] of model.nodes) {
    if (n.kind !== 'domain') continue;
    contracts.set(n.id, new Set([].concat(n.contracts || [])));
    for (const mod of [].concat(n.owns || [])) map.set(mod, n.id);
  }
  return { map, contracts };
}

function checkBoundaries(model) {
  const { map, contracts } = domainOfModule(model);
  const boundaries = [...model.nodes.values()].filter((n) => n.kind === 'boundary');
  if (!boundaries.length) return { status: 'SKIPPED (no boundaries)', violations: [], enforce: false };
  const enforce = boundaries.some((b) => b.enforce);
  const violations = [];
  const domainOfNode = (n) => n.domain || map.get(n.module);

  for (const [id, n] of model.nodes) {
    const srcDomain = domainOfNode(n);
    if (!srcDomain) continue;
    // Boundaries govern backend import graphs. A frontend page calling any HTTP endpoint, or a
    // feature grouping curating nodes across domains, is not a code-level import — skip those kinds.
    if (n.kind === 'ui' || n.kind === 'feature') continue;
    for (const field of ['calls', 'uses', 'deps']) {
      for (const target of n.edges[field] || []) {
        const base = String(target).split('.')[0];
        const tnode = model.nodes.get(base);
        if (!tnode) continue;
        const tgtDomain = domainOfNode(tnode);
        if (!tgtDomain || tgtDomain === srcDomain) continue;
        const b = boundaries.find((x) => x.from === srcDomain && (x.to === tgtDomain || x.to === '*'));
        if (b && b.mode === 'contract-only') {
          const pub = contracts.get(tgtDomain) || new Set();
          if (!pub.has(base)) {
            violations.push(`${id} (${srcDomain}) -> ${base} (${tgtDomain}) not a public contract of ${tgtDomain}`);
          }
        }
      }
    }
  }
  return { status: violations.length ? (enforce ? 'FAIL' : 'WARN') : 'OK', violations, enforce };
}

function scanCodeAnnotations(codeRoots) {
  const ids = new Set();
  let bytes = 0;
  const exts = ['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.java', '.kt', '.swift'];
  const re = /@map\s+([A-Za-z0-9._-]+)/g;
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === '.git' || name === 'dist') continue;
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (exts.some((e) => name.endsWith(e))) {
        const raw = readFileSync(p, 'utf8');
        bytes += st.size;
        let m;
        while ((m = re.exec(raw))) ids.add(m[1]);
      }
    }
  };
  for (const r of codeRoots) walk(r);
  return { ids, bytes };
}

function checkDrift(model, codeRoots) {
  const present = codeRoots.filter((r) => existsSync(r));
  if (!present.length) {
    return { status: 'SKIPPED (no code_roots present)', messages: [], hard: false, codeBytes: 0 };
  }
  const { ids, bytes } = scanCodeAnnotations(present);
  const messages = [];
  // Annotations pointing at nothing.
  for (const id of ids) {
    const base = id.split('.')[0];
    if (!model.nodes.has(base)) messages.push(`DRIFT_ORPHAN_ANNOTATION @map ${id} has no map node`);
  }
  // Implemented nodes with no annotation (only surface/logic/data/ui kinds are annotatable).
  for (const [id, n] of model.nodes) {
    if ((n.status || 'implemented') !== 'implemented') continue;
    if (!['surface', 'logic', 'data', 'ui', 'integration'].includes(n.kind)) continue;
    if (!ids.has(id)) messages.push(`DRIFT_UNANNOTATED ${id} is implemented but no @map annotation found`);
  }
  return { status: messages.length ? 'DRIFT' : 'OK', messages, hard: true, codeBytes: bytes };
}

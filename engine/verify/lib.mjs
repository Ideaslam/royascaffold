// Shared loader for the AI-Control Engine v2.
// Reads a project blueprint (profile + map + changes) into one queryable model.
// Stack-neutral: it only understands universal `kind`s, never a framework.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import yaml from 'js-yaml';

export const KINDS = [
  'surface', 'ui', 'logic', 'contract', 'data', 'integration',
  'flow', 'rule', 'boundary', 'domain', 'feature', 'module',
];

// Edge fields on a node that point at other node IDs (the graph).
// `owns` (module names) and `contracts` (forward-declared public API) are structural, NOT edges.
export const EDGE_FIELDS = ['calls', 'uses', 'deps', 'implements', 'renders'];

function readYaml(path) {
  const raw = readFileSync(path, 'utf8');
  const doc = yaml.load(raw);
  return doc == null ? {} : doc;
}

function walkYaml(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walkYaml(p));
    else if (name.endsWith('.yaml') || name.endsWith('.yml')) out.push(p);
  }
  return out;
}

// A stable hash of every map file's content — the cheap "is the index fresh?" signal.
export function hashMap(projectDir) {
  const mapDir = join(projectDir, 'map');
  const files = walkYaml(mapDir)
    .filter((f) => !f.endsWith(`${sep}index.yaml`)) // the index is derived, never an input
    .sort();
  const h = createHash('sha256');
  for (const f of files) {
    h.update(relative(projectDir, f).split(sep).join('/'));
    h.update('\0');
    h.update(readFileSync(f));
    h.update('\0');
  }
  return `sha256:${h.digest('hex')}`;
}

// Normalise a raw node object from any bundle into the common shape.
function normNode(raw, source) {
  const node = { ...raw, _source: source };
  node.edges = {};
  for (const field of EDGE_FIELDS) {
    if (raw[field]) node.edges[field] = [].concat(raw[field]);
  }
  node.rules = raw.rules ? [].concat(raw.rules) : [];
  node.history = raw.history ? [].concat(raw.history) : [];
  node.methods = raw.methods ? [].concat(raw.methods) : null;
  return node;
}

export function loadModel(projectDir) {
  const model = {
    projectDir,
    profile: {},
    nodes: new Map(),   // id -> node
    rules: new Map(),   // id -> rule
    changes: [],        // { id, meta, plan, deltas: [] }
    sizeBytes: { map: 0 },
    errors: [],
  };

  const profilePath = join(projectDir, 'profile.yaml');
  if (existsSync(profilePath)) model.profile = readYaml(profilePath);

  const addNode = (raw, source) => {
    if (!raw || !raw.id) return;
    if (model.nodes.has(raw.id)) {
      model.errors.push(`DUPLICATE_ID ${raw.id} (in ${source} and ${model.nodes.get(raw.id)._source})`);
      return;
    }
    model.nodes.set(raw.id, normNode(raw, source));
  };

  const mapDir = join(projectDir, 'map');

  // Module bundles: nodes[] + features[] (features become feature-kind nodes).
  for (const f of walkYaml(join(mapDir, 'modules'))) {
    const src = relative(projectDir, f);
    const doc = readYaml(f);
    model.sizeBytes.map += statSync(f).size;
    // The module itself is a node.
    if (doc.module) addNode({ id: `MOD-${doc.module.toUpperCase()}`, kind: 'module', name: doc.module, owner: doc.owner, status: doc.status || 'implemented', reason: doc.reason, doc: doc.doc }, src);
    for (const feat of doc.features || []) addNode({ ...feat, kind: 'feature', module: doc.module }, src);
    for (const n of doc.nodes || []) addNode({ ...n, module: doc.module }, src);
  }

  // Architecture: domains / boundaries / auth — each holds nodes[].
  for (const f of walkYaml(join(mapDir, 'architecture'))) {
    const src = relative(projectDir, f);
    const doc = readYaml(f);
    model.sizeBytes.map += statSync(f).size;
    for (const n of doc.nodes || []) addNode(n, src);
  }

  // Operational: queues, migrations, bugs (small nodes).
  const opPath = join(mapDir, 'operational.yaml');
  if (existsSync(opPath)) {
    const doc = readYaml(opPath);
    model.sizeBytes.map += statSync(opPath).size;
    for (const n of doc.nodes || []) addNode(n, 'map/operational.yaml');
  }

  // Rules.
  const rulesPath = join(mapDir, 'rules.yaml');
  if (existsSync(rulesPath)) {
    const doc = readYaml(rulesPath);
    model.sizeBytes.map += statSync(rulesPath).size;
    for (const r of doc.rules || []) {
      if (model.rules.has(r.id)) model.errors.push(`DUPLICATE_RULE ${r.id}`);
      model.rules.set(r.id, r);
    }
  }

  // Changes (deltas + plan) — the planned future.
  const changesDir = join(projectDir, 'changes');
  if (existsSync(changesDir)) {
    for (const name of readdirSync(changesDir)) {
      const cdir = join(changesDir, name);
      if (!statSync(cdir).isDirectory()) continue;
      const change = { id: name, dir: cdir, meta: {}, plan: null, deltas: [] };
      const metaPath = join(cdir, 'change.yaml');
      if (existsSync(metaPath)) change.meta = readYaml(metaPath);
      const planPath = join(cdir, 'plan.yaml');
      if (existsSync(planPath)) change.plan = readYaml(planPath);
      for (const df of walkYaml(join(cdir, 'deltas'))) {
        const d = readYaml(df);
        d._source = relative(projectDir, df);
        change.deltas.push(d);
      }
      model.changes.push(change);
    }
    model.changes.sort((a, b) => a.id.localeCompare(b.id));
  }

  return model;
}

// Build the reverse graph: for each node, who points at it.
export function buildGraph(model) {
  const graph = new Map(); // id -> { calls, used_by, deps, ... }
  const ensure = (id) => {
    if (!graph.has(id)) graph.set(id, { calls: [], used_by: [], deps: [], implements: [], implemented_by: [] });
    return graph.get(id);
  };
  for (const [id, node] of model.nodes) {
    ensure(id);
    for (const field of EDGE_FIELDS) {
      for (const target of node.edges[field] || []) {
        const base = String(target).split('.')[0]; // method links: SVC-X.method -> SVC-X
        const g = ensure(id);
        if (field === 'calls' || field === 'uses') g.calls.push(target);
        if (field === 'deps') g.deps.push(target);
        if (field === 'implements') g.implements.push(target);
        const tg = ensure(base);
        if (field === 'calls' || field === 'uses' || field === 'deps') tg.used_by.push(id);
        if (field === 'implements') tg.implemented_by.push(id);
      }
    }
  }
  return graph;
}

// Effective view = map + open deltas. Returns a shallow per-node overlay summary.
export function effectiveOverlay(model) {
  const overlay = new Map(); // nodeId -> [{ change, status, patch }]
  for (const change of model.changes) {
    for (const d of change.deltas) {
      if (!d.target) continue;
      if (!overlay.has(d.target)) overlay.set(d.target, []);
      overlay.get(d.target).push({ change: change.id, status: d.status || 'planned', patch: d.patch || {} });
    }
  }
  return overlay;
}

export { readYaml, walkYaml };

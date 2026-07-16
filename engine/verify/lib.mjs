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
// `receives`/`returns` link a surface to the request/response DTO node it consumes/produces.
export const EDGE_FIELDS = ['calls', 'uses', 'deps', 'implements', 'renders', 'receives', 'returns'];

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

  // Data model: entities live in map/data/<domain>/<entity>.yaml — one node per file, domain-owned
  // (not module-owned). DTOs live in map/data/dto/<module>.yaml — a `nodes:` list under a file-level
  // `module:` that the loader stamps onto each node (DTOs are module-owned, linked from surfaces via
  // receives/returns). Logic services reference entities via `deps: [ENT-...]`.
  for (const f of walkYaml(join(mapDir, 'data'))) {
    const src = relative(projectDir, f);
    const doc = readYaml(f);
    model.sizeBytes.map += statSync(f).size;
    const fileModule = doc.module; // dto bundles set this; entity files don't
    if (Array.isArray(doc.nodes)) for (const n of doc.nodes) addNode(fileModule && !n.module ? { ...n, module: fileModule } : n, src);
    else if (doc.id) addNode(doc, src);
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
        if (field === 'calls' || field === 'uses' || field === 'deps' || field === 'receives' || field === 'returns') tg.used_by.push(id);
        if (field === 'implements') tg.implemented_by.push(id);
      }
    }
  }
  return graph;
}

// Resolve which apps (repositories) each node belongs to. Rules:
//   1. explicit `apps: [..]` or `app: ..` on the node wins (a node can live in many repos);
//   2. otherwise a server-side kind (surface/logic/contract/data/integration/flow) defaults to
//      profile.default_app (the API repo);
//   3. a `feature` spans the union of the apps of the nodes it `uses`;
//   4. a `module` spans the union of the apps of all its member nodes (components + features).
// Returns Map<nodeId, string[]> (sorted, deduped).
const SERVER_KINDS = new Set(['surface', 'logic', 'contract', 'data', 'integration', 'flow']);

export function computeApps(model) {
  const defaultApp = model.profile.default_app || null;
  const sets = new Map(); // id -> Set(app keys)

  const explicitApps = (n) => {
    if (Array.isArray(n.apps)) return n.apps;
    if (typeof n.apps === 'string') return [n.apps];
    if (typeof n.app === 'string') return [n.app];
    return null;
  };

  // Pass 1 — leaves: explicit assignment, else server-kind default.
  for (const [id, n] of model.nodes) {
    const ex = explicitApps(n);
    if (ex) sets.set(id, new Set(ex));
    else if (SERVER_KINDS.has(n.kind) && defaultApp) sets.set(id, new Set([defaultApp]));
    else sets.set(id, new Set());
  }

  // Pass 2 — features: union of the apps of everything they use.
  for (const [id, n] of model.nodes) {
    if (n.kind !== 'feature') continue;
    const s = sets.get(id);
    for (const t of n.edges?.uses || []) {
      for (const a of sets.get(String(t).split('.')[0]) || []) s.add(a);
    }
  }

  // Pass 3 — modules: union of every member node's apps (members already resolved above).
  const membersByModule = new Map();
  for (const [id, n] of model.nodes) {
    if (!n.module) continue;
    if (!membersByModule.has(n.module)) membersByModule.set(n.module, []);
    membersByModule.get(n.module).push(id);
  }
  for (const [id, n] of model.nodes) {
    if (n.kind !== 'module') continue;
    const s = sets.get(id);
    for (const mid of membersByModule.get(n.name) || []) {
      for (const a of sets.get(mid) || []) s.add(a);
    }
  }

  const out = new Map();
  for (const [id, s] of sets) out.set(id, [...s].sort());
  return out;
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

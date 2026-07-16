// View DTOs for the Roya System Viewer — built from the live map model.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { loadModel, buildGraph, computeApps } from '../verify/lib.mjs';

const COMPONENT_KINDS = ['surface', 'logic', 'data', 'ui', 'contract', 'integration', 'flow'];
const LEAF_KINDS = ['surface', 'ui', 'logic', 'contract', 'data', 'integration', 'flow'];
const ENGINE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

let _kindsCache = null;
export function kindsInfo() {
  if (_kindsCache) return _kindsCache;
  const p = join(ENGINE_DIR, 'kinds.yaml');
  if (!existsSync(p)) return {};
  const doc = yaml.load(readFileSync(p, 'utf8')) || {};
  _kindsCache = doc.kinds || {};
  return _kindsCache;
}

function loadContext(projectDir) {
  const model = loadModel(projectDir);
  const graph = buildGraph(model);
  const apps = computeApps(model);
  return { model, graph, apps };
}

// Expand app keys into display refs (label + repo) using profile.apps.
function appRefs(model, keys) {
  const meta = model.profile.apps || [];
  return (keys || []).map((k) => {
    const a = meta.find((x) => x.key === k);
    return { key: k, label: a?.label || k, repo: a?.repo || null, side: a?.side || null };
  });
}

function nodeRef(model, id) {
  const base = String(id).split('.')[0];
  const n = model.nodes.get(base);
  if (!n) return { id: base, name: null, kind: null, status: null };
  return {
    id: base,
    name: n.name || n.collection || n.route || null,
    kind: n.kind,
    subtype: n.subtype || null,
    status: n.status || 'implemented',
  };
}

function resolveRules(model, ruleIds) {
  return (ruleIds || []).map((rid) => {
    const r = model.rules.get(rid);
    return r
      ? { id: rid, title: r.title, constraint: r.constraint, scope: r.scope }
      : { id: rid, title: null, constraint: null, scope: null };
  });
}

function readStatusYaml(projectDir) {
  const p = join(projectDir, 'status.yaml');
  if (!existsSync(p)) return null;
  return yaml.load(readFileSync(p, 'utf8')) || null;
}

function readVerifyReport(projectDir) {
  const p = join(projectDir, 'verify', 'verify-report.yaml');
  if (!existsSync(p)) return null;
  return yaml.load(readFileSync(p, 'utf8')) || null;
}

function moduleNameFromId(id) {
  return id.replace(/^MOD-/, '').toLowerCase();
}

function nodesForModule(model, moduleName) {
  const features = [];
  const components = [];
  for (const [id, n] of model.nodes) {
    if (n.module !== moduleName) continue;
    if (n.kind === 'feature') features.push({ id, ...n });
    else if (COMPONENT_KINDS.includes(n.kind)) components.push({ id, ...n });
  }
  return { features, components };
}

export function overview(projectDir) {
  const { model, apps } = loadContext(projectDir);
  const statusYaml = readStatusYaml(projectDir);
  const verifyReport = readVerifyReport(projectDir);

  // Per-app node counts (implementation leaves only, so counts reflect real shipping units).
  const appCounts = {};
  for (const [id, n] of model.nodes) {
    if (!LEAF_KINDS.includes(n.kind)) continue;
    for (const k of apps.get(id) || []) appCounts[k] = (appCounts[k] || 0) + 1;
  }
  const appsOut = (model.profile.apps || []).map((a) => ({
    key: a.key,
    label: a.label || a.key,
    repo: a.repo || null,
    framework: a.framework || null,
    side: a.side || null,
    nodeCount: appCounts[a.key] || 0,
  }));

  const modules = [];
  for (const [id, n] of model.nodes) {
    if (n.kind !== 'module') continue;
    const modName = n.name || moduleNameFromId(id);
    const { features, components } = nodesForModule(model, modName);
    modules.push({
      id,
      name: modName,
      owner: n.owner || null,
      status: n.status || 'implemented',
      reason: n.reason || null,
      featureCount: features.length,
      componentCount: components.length,
    });
  }
  modules.sort((a, b) => a.name.localeCompare(b.name));

  return {
    product: model.profile?.product?.name || 'System',
    summary: model.profile?.product?.summary || null,
    generatedAt: statusYaml?.generated_at || null,
    totals: statusYaml?.totals || {},
    statusRollup: statusYaml?.status_rollup || {},
    backlogCount: (statusYaml?.backlog || []).length,
    backlog: statusYaml?.backlog || [],
    attention: statusYaml?.attention || [],
    verifyStatus: verifyReport?.status || null,
    verifyChecks: verifyReport?.checks || {},
    apps: appsOut,
    modules,
    kinds: kindsInfo(),
  };
}

export function moduleView(projectDir, modId) {
  const { model, apps } = loadContext(projectDir);
  const mod = model.nodes.get(modId);
  if (!mod || mod.kind !== 'module') return null;

  const modName = mod.name || moduleNameFromId(modId);
  const { features, components } = nodesForModule(model, modName);

  const featuresOut = features.map((f) => ({
    id: f.id,
    name: f.name || f.id,
    visibility: f.visibility || null,
    status: f.status || 'implemented',
    useCount: (f.uses || f.edges?.uses || []).length,
    hasSpec: Boolean(f.spec),
  }));

  const byKind = {};
  for (const c of components) {
    const k = c.kind;
    if (!byKind[k]) byKind[k] = [];
    byKind[k].push({
      id: c.id,
      name: c.name || c.collection || c.route || c.id,
      subtype: c.subtype || null,
      status: c.status || 'implemented',
      reason: c.reason || null,
    });
  }
  for (const k of Object.keys(byKind)) {
    byKind[k].sort((a, b) => a.id.localeCompare(b.id));
  }

  // Entities are domain-owned (map/data/), not module-owned. Derive the ones this module
  // touches from its logic/surface deps + receives/returns, so the module still "shows" them.
  const entityIds = new Set();
  for (const c of components) {
    const refs = [
      ...(c.deps || c.edges?.deps || []),
      ...(c.receives || c.edges?.receives || []),
      ...(c.returns || c.edges?.returns || []),
    ];
    for (const r of refs) {
      const base = String(r).split('.')[0];
      const t = model.nodes.get(base);
      if (t && t.kind === 'data') entityIds.add(base);
    }
  }
  const entitiesUsed = [...entityIds].sort().map((id) => {
    const t = model.nodes.get(id);
    return {
      id,
      name: t.collection || t.collection_pattern || t.name || id,
      subtype: t.subtype || null,
      domain: t.domain || null,
      status: t.status || 'implemented',
    };
  });

  return {
    id: modId,
    name: modName,
    owner: mod.owner || null,
    status: mod.status || 'implemented',
    reason: mod.reason || null,
    doc: mod.doc || null,
    source: mod._source || null,
    features: featuresOut.sort((a, b) => a.id.localeCompare(b.id)),
    componentsByKind: byKind,
    componentCount: components.length,
    entitiesUsed,
    apps: appRefs(model, apps.get(modId)),
  };
}

// One app / repository, as a tree: its implementation nodes grouped by module, then by kind.
export function appView(projectDir, key) {
  const { model, apps } = loadContext(projectDir);
  const meta = (model.profile.apps || []).find((a) => a.key === key);
  if (!meta) return null;

  const NOMOD = '(shared / data model)';
  const groups = new Map();
  for (const [id, n] of model.nodes) {
    if (!LEAF_KINDS.includes(n.kind)) continue;
    if (!(apps.get(id) || []).includes(key)) continue;
    const g = n.module || NOMOD;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(n);
  }

  const modules = [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mod, ns]) => {
      const byKind = {};
      for (const n of ns) {
        if (!byKind[n.kind]) byKind[n.kind] = [];
        byKind[n.kind].push({
          id: n.id,
          name: n.name || n.collection || n.route || n.id,
          subtype: n.subtype || null,
          status: n.status || 'implemented',
        });
      }
      for (const k of Object.keys(byKind)) byKind[k].sort((a, b) => a.id.localeCompare(b.id));
      const modNode = model.nodes.get(`MOD-${String(mod).toUpperCase()}`);
      return { module: mod, moduleId: modNode ? modNode.id : null, count: ns.length, byKind };
    });

  return {
    key,
    label: meta.label || key,
    repo: meta.repo || null,
    framework: meta.framework || null,
    side: meta.side || null,
    total: modules.reduce((a, m) => a + m.count, 0),
    modules,
  };
}

// Data Model: every entity (kind:data) grouped by its owning domain. Entities live in
// map/data/<domain>/ and are shared across modules, so they get their own top-level view.
export function dataModel(projectDir) {
  const { model } = loadContext(projectDir);
  const byDomain = new Map();
  for (const [id, n] of model.nodes) {
    if (n.kind !== 'data') continue;
    const dom = n.domain || 'unassigned';
    if (!byDomain.has(dom)) byDomain.set(dom, []);
    byDomain.get(dom).push({
      id,
      name: n.collection || n.collection_pattern || n.name || id,
      subtype: n.subtype || null,
      status: n.status || 'implemented',
      collection: n.collection || n.collection_pattern || null,
      doc: n.doc || null,
      fieldCount: (n.spec?.fields || []).length,
      relations: n.spec?.relations || null,
      inferred: n.spec?.source === 'inferred',
    });
  }
  const domains = [...byDomain.keys()].sort().map((domId) => {
    const dn = model.nodes.get(domId);
    return {
      id: domId,
      name: dn?.name || domId,
      doc: dn?.doc || null,
      entities: byDomain.get(domId).sort((a, b) => a.id.localeCompare(b.id)),
    };
  });
  return {
    total: [...model.nodes.values()].filter((n) => n.kind === 'data').length,
    domains,
  };
}

export function featureView(projectDir, featId) {
  const { model, apps } = loadContext(projectDir);
  const feat = model.nodes.get(featId);
  if (!feat || feat.kind !== 'feature') return null;

  const uses = (feat.uses || feat.edges?.uses || []).map((u) => nodeRef(model, u));

  return {
    id: featId,
    name: feat.name || featId,
    module: feat.module || null,
    visibility: feat.visibility || null,
    status: feat.status || 'implemented',
    doc: feat.doc || null,
    source: feat._source || null,
    spec: feat.spec || null,
    uses,
    apps: appRefs(model, apps.get(featId)),
    rules: resolveRules(model, feat.spec?.rules || feat.rules || []),
  };
}

function pickNodeFields(n) {
  const fields = {};
  const keys = [
    'kind', 'subtype', 'module', 'domain', 'name', 'status', 'reason', 'reason_note',
    'route', 'auth', 'app', 'collection', 'collection_pattern', 'legacy', 'workspace_scoped',
    'methods', 'history', 'route_prefix',
    'theme', 'i18n', 'rtl', 'states', 'worker', 'layer', 'mode', 'enforce',
    'from', 'to', 'owns', 'contracts', 'visibility', 'owner',
  ];
  for (const k of keys) {
    if (n[k] !== undefined) fields[k] = n[k];
  }
  return fields;
}

export function nodeView(projectDir, nodeId) {
  const { model, graph, apps } = loadContext(projectDir);
  const base = String(nodeId).split('.')[0];
  const n = model.nodes.get(base);
  if (!n) return null;

  const g = graph.get(base) || {};
  const edgeGroups = {};

  const addEdgeGroup = (label, targets) => {
    if (!targets?.length) return;
    edgeGroups[label] = targets.map((t) => ({ target: t, ...nodeRef(model, t) }));
  };

  addEdgeGroup('calls', g.calls);
  addEdgeGroup('used_by', [...new Set(g.used_by || [])]);
  addEdgeGroup('deps', g.deps);
  addEdgeGroup('implements', g.implements);
  addEdgeGroup('implemented_by', [...new Set(g.implemented_by || [])]);
  if (n.edges?.renders || n.renders) {
    addEdgeGroup('renders', n.renders || n.edges?.renders);
  }
  if (n.edges?.uses || n.uses) {
    addEdgeGroup('uses', n.uses || n.edges?.uses);
  }
  if (n.edges?.receives || n.receives) {
    addEdgeGroup('receives', n.receives || n.edges?.receives);
  }
  if (n.edges?.returns || n.returns) {
    addEdgeGroup('returns', n.returns || n.edges?.returns);
  }

  const allKinds = kindsInfo();

  return {
    id: base,
    ...pickNodeFields(n),
    kindInfo: allKinds[n.kind] || null,
    doc: n.doc || null,
    spec: n.spec || null,
    source: n._source || null,
    apps: appRefs(model, apps.get(base)),
    rules: resolveRules(model, n.rules || []),
    edges: edgeGroups,
  };
}

export function graphStub(projectDir) {
  const { model, graph } = loadContext(projectDir);
  const nodes = [];
  const edges = [];

  for (const [id, n] of model.nodes) {
    nodes.push({
      id,
      kind: n.kind,
      status: n.status || 'implemented',
      module: n.module || null,
      label: n.name || n.collection || n.route || id,
    });
  }

  for (const [from, g] of graph) {
    for (const field of ['calls', 'deps', 'implements']) {
      for (const target of g[field] || []) {
        edges.push({ from, to: String(target).split('.')[0], type: field });
      }
    }
  }

  return {
    stub: true,
    message: 'Graph network view coming soon',
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodes: nodes.slice(0, 50),
    edges: edges.slice(0, 100),
  };
}

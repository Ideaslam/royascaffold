// View DTOs for the Roya System Viewer — built from the live map model.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { loadModel, buildGraph } from '../verify/lib.mjs';

const COMPONENT_KINDS = ['surface', 'logic', 'data', 'ui', 'contract', 'integration', 'flow'];
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
  return { model, graph };
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
  const { model } = loadContext(projectDir);
  const statusYaml = readStatusYaml(projectDir);
  const verifyReport = readVerifyReport(projectDir);

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
    modules,
    kinds: kindsInfo(),
  };
}

export function moduleView(projectDir, modId) {
  const { model } = loadContext(projectDir);
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
  };
}

export function featureView(projectDir, featId) {
  const { model } = loadContext(projectDir);
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
    rules: resolveRules(model, feat.spec?.rules || feat.rules || []),
  };
}

function pickNodeFields(n) {
  const fields = {};
  const keys = [
    'kind', 'subtype', 'module', 'name', 'status', 'reason', 'route', 'auth', 'app',
    'collection', 'workspace_scoped', 'methods', 'history', 'route_prefix',
    'theme', 'i18n', 'rtl', 'states', 'worker', 'layer', 'mode', 'enforce',
    'from', 'to', 'owns', 'contracts', 'visibility', 'owner',
  ];
  for (const k of keys) {
    if (n[k] !== undefined) fields[k] = n[k];
  }
  return fields;
}

export function nodeView(projectDir, nodeId) {
  const { model, graph } = loadContext(projectDir);
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

  const allKinds = kindsInfo();

  return {
    id: base,
    ...pickNodeFields(n),
    kindInfo: allKinds[n.kind] || null,
    doc: n.doc || null,
    spec: n.spec || null,
    source: n._source || null,
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

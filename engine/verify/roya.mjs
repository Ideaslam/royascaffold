#!/usr/bin/env node
// roya — the AI-Control Engine v2 CLI.
//   roya init      <projectDir>        scaffold a NEW empty system (profile + map skeleton + index)
//   roya index     <projectDir>        regenerate map/index.yaml + status.md
//   roya verify    <projectDir>        check freshness + consistency, emit verify-report.yaml
//   roya query     <projectDir> <id>   show a node + its inbound/outbound edges
//   roya effective <projectDir> <id>   show the IMPLEMENTED node + any PLANNED deltas (which change owns them)

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { generateIndex } from './index.mjs';
import { verify } from './verify.mjs';
import { loadModel, buildGraph, effectiveOverlay } from './lib.mjs';
import { scaffoldFiles } from './scaffold.mjs';

const [, , cmd, projectDir = 'project', arg] = process.argv;

function printReport(r) {
  const icon = { PASS: 'PASS', STALE: 'STALE', DRIFT: 'DRIFT', FAIL: 'FAIL' }[r.status] || r.status;
  console.log(`\nverify: ${icon}`);
  console.log('checks:', JSON.stringify(r.checks));
  console.log('summary:', JSON.stringify(r.summary));
  if (r.errors.length) {
    console.log(`\nerrors (${r.errors.length}):`);
    for (const e of r.errors) console.log('  x ' + e);
  }
  if (r.warnings.length) {
    console.log(`\nwarnings (${r.warnings.length}):`);
    for (const w of r.warnings) console.log('  ! ' + w);
  }
}

if (cmd === 'init') {
  // Genesis: born-empty system. The map starts empty; the whole v1 is a planned change program.
  if (existsSync(join(projectDir, 'profile.yaml'))) {
    console.error(`refusing to init: ${join(projectDir, 'profile.yaml')} already exists (not empty)`);
    process.exit(1);
  }
  for (const [rel, contents] of Object.entries(scaffoldFiles())) {
    const full = join(projectDir, rel);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, contents);
  }
  const { index } = generateIndex(projectDir);
  const total = Object.values(index.totals).reduce((a, b) => a + b, 0);
  console.log(`init: scaffolded ${projectDir}/ (profile + description + empty map, ${total} nodes) + index.yaml`);
  console.log('next: fill profile.yaml + description.md, then plan the foundation change program (engine/flows/new-system.md).');
} else if (cmd === 'index') {
  const { index } = generateIndex(projectDir);
  console.log(`index: wrote map/index.yaml (${Object.values(index.totals).reduce((a, b) => a + b, 0)} nodes) + status.md`);
} else if (cmd === 'verify') {
  const r = verify(projectDir);
  printReport(r);
  process.exit(r.status === 'PASS' ? 0 : 1);
} else if (cmd === 'query') {
  const model = loadModel(projectDir);
  const graph = buildGraph(model);
  const n = model.nodes.get(arg);
  if (!n) { console.error(`no node ${arg}`); process.exit(1); }
  const g = graph.get(arg) || {};
  const pending = (effectiveOverlay(model).get(arg) || []).filter((p) => p.status !== 'implemented');
  console.log(JSON.stringify({
    id: arg, kind: n.kind, subtype: n.subtype, status: n.status,
    module: n.module, rules: n.rules, methods: n.methods,
    calls: g.calls, used_by: [...new Set(g.used_by || [])],
    deps: g.deps, implemented_by: [...new Set(g.implemented_by || [])],
    pending_changes: pending.map((p) => p.change),
  }, null, 2));
} else if (cmd === 'effective') {
  // The B2/B3 answer: what is REAL now vs what a plan will change (and which plan owns it).
  const model = loadModel(projectDir);
  const n = model.nodes.get(arg);
  if (!n) { console.error(`no node ${arg}`); process.exit(1); }
  const pending = effectiveOverlay(model).get(arg) || [];
  console.log(JSON.stringify({
    id: arg,
    implemented: { status: n.status, ...pickShallow(n) },
    pending: pending.map((p) => ({ change: p.change, status: p.status, patch: p.patch })),
    note: pending.length
      ? 'Fields under `pending.patch` are NOT in the code yet — they belong to the named change.'
      : 'No open change touches this node — the map IS the current truth.',
  }, null, 2));
} else {
  console.log('usage: roya <init|index|verify|query|effective> <projectDir> [id]');
  process.exit(1);
}

function pickShallow(n) {
  const out = {};
  for (const k of ['kind', 'subtype', 'module', 'collection', 'workspace_scoped', 'methods', 'rules', 'history']) {
    if (n[k] !== undefined) out[k] = n[k];
  }
  return out;
}

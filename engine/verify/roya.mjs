#!/usr/bin/env node
// roya — the AI-Control Engine v2 CLI.
//   roya index  <projectDir>   regenerate map/index.yaml + status.md
//   roya verify <projectDir>   check freshness + consistency, emit verify-report.yaml
//   roya query  <projectDir> <id>   show a node + its inbound/outbound edges

import { generateIndex } from './index.mjs';
import { verify } from './verify.mjs';
import { loadModel, buildGraph } from './lib.mjs';

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

if (cmd === 'index') {
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
  console.log(JSON.stringify({
    id: arg, kind: n.kind, subtype: n.subtype, status: n.status,
    module: n.module, rules: n.rules, methods: n.methods,
    calls: g.calls, used_by: [...new Set(g.used_by || [])],
    deps: g.deps, implemented_by: [...new Set(g.implemented_by || [])],
  }, null, 2));
} else {
  console.log('usage: roya <index|verify|query> <projectDir> [id]');
  process.exit(1);
}

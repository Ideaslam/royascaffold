// Roya System Viewer — client-side hash router + drill-down tables.

const $ = (sel) => document.querySelector(sel);
const content = $('#content');
const breadcrumbs = $('#breadcrumbs');
const productTitle = $('#product-title');
const productSummary = $('#product-summary');
const verifyBadge = $('#verify-badge');
const verifyDrawer = $('#verify-drawer');
const verifyDrawerBody = $('#verify-drawer-body');
const drawerBackdrop = $('#drawer-backdrop');

// ── Status pill ──────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  implemented: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  partial: 'bg-amber-50 text-amber-700 border-amber-200',
  planned: 'bg-sky-50 text-sky-700 border-sky-200',
  deferred: 'bg-slate-100 text-slate-600 border-slate-200',
};

function statusPill(status) {
  const s = status || 'implemented';
  const cls = STATUS_COLORS[s] || STATUS_COLORS.implemented;
  return `<span class="inline-flex px-2 py-0.5 rounded border text-xs font-medium ${cls}">${s}</span>`;
}

function verifyBadgePill(status) {
  if (!status) return;
  verifyBadge.classList.remove('hidden');
  const colors = {
    PASS: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    FAIL: 'bg-red-50 text-red-700 border border-red-200',
    STALE: 'bg-amber-50 text-amber-700 border border-amber-200',
    DRIFT: 'bg-orange-50 text-orange-700 border border-orange-200',
  };
  verifyBadge.className = `px-2 py-1 rounded text-xs font-medium ${colors[status] || 'bg-slate-100 text-slate-600 border border-slate-200'}`;
  verifyBadge.textContent = `verify: ${status}`;
}

// ── Navigation ───────────────────────────────────────────────────────────────
function navigate(hash) {
  location.hash = hash;
}

function parseRoute() {
  const h = location.hash.slice(1) || '/';
  const parts = h.split('/').filter(Boolean);
  if (parts.length === 0) return { view: 'overview' };
  if (parts[0] === 'module' && parts[1]) return { view: 'module', id: parts[1] };
  if (parts[0] === 'feature' && parts[1]) return { view: 'feature', id: parts[1] };
  if (parts[0] === 'node' && parts[1]) return { view: 'node', id: parts[1] };
  return { view: 'overview' };
}

function setBreadcrumbs(crumbs) {
  breadcrumbs.innerHTML = crumbs
    .map((c, i) => {
      const isLast = i === crumbs.length - 1;
      if (isLast) return `<span class="text-slate-900 font-medium">${c.label}</span>`;
      return `<a href="${c.hash}" class="hover:text-indigo-600 transition">${c.label}</a><span class="mx-1 text-slate-300">/</span>`;
    })
    .join('');
}

// ── API ──────────────────────────────────────────────────────────────────────
async function api(path, opts) {
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

// ── Table helper ─────────────────────────────────────────────────────────────
function renderTable(columns, rows, emptyMsg = 'Nothing here.') {
  if (!rows.length) return `<p class="text-slate-500 text-sm py-4">${emptyMsg}</p>`;
  const head = columns.map((c) => `<th class="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">${c.label}</th>`).join('');
  const body = rows
    .map((row) => {
      const cells = columns.map((c) => `<td class="px-4 py-3 text-sm text-slate-700">${c.render(row)}</td>`).join('');
      return `<tr class="border-t border-slate-200 hover:bg-slate-50 transition">${cells}</tr>`;
    })
    .join('');
  return `<div class="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm"><table class="w-full"><thead class="bg-slate-50"><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function viewBtn(hash, label = 'View details') {
  return `<button onclick="location.hash='${hash}'" class="px-2.5 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-700 text-white transition whitespace-nowrap">${label}</button>`;
}

function nodeLink(id, label) {
  return `<button onclick="location.hash='#/node/${id}'" class="font-mono text-indigo-600 hover:text-indigo-800 text-xs">${label || id}</button>`;
}

// ── Stats cards ──────────────────────────────────────────────────────────────
function renderStats(totals, statusRollup, backlogCount) {
  const totalNodes = Object.values(totals || {}).reduce((a, b) => a + b, 0);
  const implemented = Object.values(statusRollup || {}).reduce((a, r) => a + (r.implemented || 0), 0);
  const planned = Object.values(statusRollup || {}).reduce((a, r) => a + (r.planned || 0), 0);
  const partial = Object.values(statusRollup || {}).reduce((a, r) => a + (r.partial || 0), 0);

  const cards = [
    { label: 'Total nodes', value: totalNodes, color: 'text-slate-900' },
    { label: 'Implemented', value: implemented, color: 'text-emerald-600' },
    { label: 'Planned', value: planned, color: 'text-sky-600' },
    { label: 'Partial', value: partial, color: 'text-amber-600' },
    { label: 'Backlog', value: backlogCount, color: 'text-indigo-600' },
  ];

  return `<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
    ${cards.map((c) => `<div class="rounded-lg border border-slate-200 bg-white shadow-sm px-4 py-3">
      <div class="text-xs text-slate-500 uppercase tracking-wide">${c.label}</div>
      <div class="text-2xl font-semibold ${c.color} mt-1">${c.value}</div>
    </div>`).join('')}
  </div>`;
}

function renderKindBreakdown(totals) {
  const rows = Object.entries(totals || {})
    .sort((a, b) => b[1] - a[1])
    .map(([kind, count]) => ({ kind, count }));
  return renderTable(
    [
      { label: 'Kind', render: (r) => `<span class="font-medium">${r.kind}</span>` },
      { label: 'Count', render: (r) => r.count },
    ],
    rows,
    'No nodes.',
  );
}

// ── Views ──────────────────────────────────────────────────────────────────────
async function renderOverview() {
  setBreadcrumbs([{ label: 'System', hash: '#/' }]);
  content.innerHTML = '<div class="text-slate-500 py-12 text-center">Loading overview…</div>';

  const data = await api('/api/overview');
  productTitle.textContent = data.product;
  if (data.summary) {
    productSummary.textContent = data.summary;
    productSummary.classList.remove('hidden');
  }
  verifyBadgePill(data.verifyStatus);

  const moduleRows = data.modules.map((m) => ({
    ...m,
    hash: `#/module/${m.id}`,
  }));

  content.innerHTML = `
    ${renderStats(data.totals, data.statusRollup, data.backlogCount)}
    <div class="grid lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2">
        <h2 class="text-lg font-semibold mb-3">Modules <span class="text-slate-500 text-sm font-normal">(${data.modules.length})</span></h2>
        ${renderTable(
          [
            { label: 'Module', render: (r) => `<span class="font-mono text-sm">${r.name}</span>` },
            { label: 'Owner', render: (r) => r.owner ? nodeLink(r.owner, r.owner) : '—' },
            { label: 'Status', render: (r) => statusPill(r.status) },
            { label: 'Features', render: (r) => r.featureCount },
            { label: 'Components', render: (r) => r.componentCount },
            { label: '', render: (r) => viewBtn(r.hash) },
          ],
          moduleRows,
        )}
      </div>
      <div>
        <h2 class="text-lg font-semibold mb-3">By kind</h2>
        ${renderKindBreakdown(data.totals)}
        ${data.backlogCount ? `<div class="mt-6"><h2 class="text-lg font-semibold mb-3">Backlog <span class="text-slate-500 text-sm font-normal">(${data.backlogCount})</span></h2>
          ${renderTable(
            [
              { label: 'ID', render: (r) => `<span class="font-mono text-xs">${r.id}</span>` },
              { label: 'Title', render: (r) => r.title },
              { label: 'Owner', render: (r) => r.owner },
              { label: 'Status', render: (r) => statusPill(r.status) },
            ],
            data.backlog.slice(0, 10),
          )}</div>` : ''}
      </div>
    </div>`;
}

async function renderModule(id) {
  setBreadcrumbs([
    { label: 'System', hash: '#/' },
    { label: id, hash: `#/module/${id}` },
  ]);
  content.innerHTML = '<div class="text-slate-500 py-12 text-center">Loading module…</div>';

  const data = await api(`/api/module/${id}`);
  if (!data) { content.innerHTML = '<p class="text-red-600">Module not found.</p>'; return; }

  setBreadcrumbs([
    { label: 'System', hash: '#/' },
    { label: data.name, hash: `#/module/${id}` },
  ]);

  const featureRows = data.features.map((f) => ({ ...f, hash: `#/feature/${f.id}` }));
  const kindSections = Object.entries(data.componentsByKind)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kind, items]) => {
      const rows = items.map((c) => ({ ...c, hash: `#/node/${c.id}` }));
      return `<div class="mb-6">
        <h3 class="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">${kind} <span class="text-slate-400 font-normal">(${items.length})</span></h3>
        ${renderTable(
          [
            { label: 'ID', render: (r) => `<span class="font-mono text-xs">${r.id}</span>` },
            { label: 'Name', render: (r) => r.name || '—' },
            { label: 'Subtype', render: (r) => r.subtype || '—' },
            { label: 'Status', render: (r) => statusPill(r.status) },
            { label: '', render: (r) => viewBtn(r.hash) },
          ],
          rows,
        )}
      </div>`;
    })
    .join('');

  content.innerHTML = `
    <div class="mb-6 flex flex-wrap items-start gap-4">
      <div>
        <h2 class="text-2xl font-semibold">${data.name}</h2>
        <p class="font-mono text-sm text-slate-500 mt-1">${data.id}</p>
      </div>
      <div class="flex gap-2 items-center">
        ${statusPill(data.status)}
        ${data.owner ? `<span class="text-sm text-slate-500">Owner: ${nodeLink(data.owner, data.owner)}</span>` : ''}
      </div>
    </div>
    ${data.reason ? `<p class="text-sm text-amber-800 mb-4 border border-amber-200 rounded-lg px-3 py-2 bg-amber-50">${data.reason}</p>` : ''}

    <h2 class="text-lg font-semibold mb-3">Features <span class="text-slate-500 text-sm font-normal">(${data.features.length})</span></h2>
    ${renderTable(
      [
        { label: 'Feature', render: (r) => `<span class="font-mono text-xs">${r.id}</span>` },
        { label: 'Name', render: (r) => r.name },
        { label: 'Visibility', render: (r) => r.visibility || '—' },
        { label: 'Uses', render: (r) => r.useCount },
        { label: 'Spec', render: (r) => r.hasSpec ? '<span class="text-emerald-600">yes</span>' : '<span class="text-slate-400">—</span>' },
        { label: 'Status', render: (r) => statusPill(r.status) },
        { label: '', render: (r) => viewBtn(r.hash) },
      ],
      featureRows,
      'No features in this module.',
    )}

    <h2 class="text-lg font-semibold mt-8 mb-3">Components <span class="text-slate-500 text-sm font-normal">(${data.componentCount})</span></h2>
    ${kindSections || '<p class="text-slate-500 text-sm">No components.</p>'}`;
}

async function renderFeature(id) {
  content.innerHTML = '<div class="text-slate-500 py-12 text-center">Loading feature…</div>';
  const data = await api(`/api/feature/${id}`);
  if (!data) { content.innerHTML = '<p class="text-red-600">Feature not found.</p>'; return; }

  setBreadcrumbs([
    { label: 'System', hash: '#/' },
    ...(data.module ? [{ label: data.module, hash: `#/module/MOD-${data.module.toUpperCase()}` }] : []),
    { label: data.name, hash: `#/feature/${id}` },
  ]);

  const spec = data.spec || {};
  const specHtml = data.spec ? `
    <div class="rounded-lg border border-slate-200 bg-white shadow-sm p-4 mb-6 space-y-4">
      ${spec.narrative ? `<div><h3 class="text-xs uppercase text-slate-500 mb-1">Narrative</h3><p class="text-sm leading-relaxed whitespace-pre-wrap text-slate-700">${spec.narrative}</p></div>` : ''}
      ${spec.acceptance?.length ? `<div><h3 class="text-xs uppercase text-slate-500 mb-1">Acceptance</h3><ul class="list-disc list-inside text-sm space-y-1 text-slate-700">${spec.acceptance.map((a) => `<li>${a}</li>`).join('')}</ul></div>` : ''}
      ${spec.edge_cases?.length ? `<div><h3 class="text-xs uppercase text-slate-500 mb-1">Edge cases</h3><ul class="list-disc list-inside text-sm space-y-1 text-slate-700">${spec.edge_cases.map((e) => `<li>${e}</li>`).join('')}</ul></div>` : ''}
    </div>` : '<p class="text-slate-500 text-sm mb-6">No spec on this feature.</p>';

  const useRows = data.uses.map((u) => ({ ...u, hash: `#/node/${u.id}` }));

  content.innerHTML = `
    <div class="mb-6">
      <h2 class="text-2xl font-semibold">${data.name}</h2>
      <p class="font-mono text-sm text-slate-500 mt-1">${data.id}</p>
      <div class="flex gap-2 mt-2">${statusPill(data.status)}</div>
    </div>
    ${specHtml}
    <h2 class="text-lg font-semibold mb-3">Uses <span class="text-slate-500 text-sm font-normal">(${data.uses.length})</span></h2>
    ${renderTable(
      [
        { label: 'ID', render: (r) => `<span class="font-mono text-xs">${r.id}</span>` },
        { label: 'Kind', render: (r) => r.kind || '—' },
        { label: 'Name', render: (r) => r.name || '—' },
        { label: 'Status', render: (r) => statusPill(r.status) },
        { label: '', render: (r) => viewBtn(r.hash) },
      ],
      useRows,
      'No uses.',
    )}`;
}

function renderSpecBlock(spec) {
  if (!spec) return '';
  return `<div class="rounded-lg border border-slate-200 bg-white shadow-sm p-4 mb-4">
    <h3 class="text-xs uppercase text-slate-500 mb-2">Spec</h3>
    <pre class="text-xs font-mono text-slate-700 bg-slate-50 rounded p-3 overflow-x-auto whitespace-pre-wrap">${JSON.stringify(spec, null, 2)}</pre>
  </div>`;
}

function renderFields(obj) {
  const skip = new Set(['id', 'spec', 'source', 'rules', 'edges']);
  const entries = Object.entries(obj).filter(([k, v]) => !skip.has(k) && v != null);
  if (!entries.length) return '';
  return `<div class="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden mb-4">
    <table class="w-full text-sm">
      ${entries.map(([k, v]) => `<tr class="border-t border-slate-200 first:border-0">
        <td class="px-4 py-2 text-slate-500 font-medium w-40 align-top bg-slate-50">${k}</td>
        <td class="px-4 py-2 font-mono text-xs break-all text-slate-700">${Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v)}</td>
      </tr>`).join('')}
    </table>
  </div>`;
}

async function renderNode(id) {
  content.innerHTML = '<div class="text-slate-500 py-12 text-center">Loading node…</div>';
  const data = await api(`/api/node/${id}`);
  if (!data) { content.innerHTML = '<p class="text-red-600">Node not found.</p>'; return; }

  const crumbs = [{ label: 'System', hash: '#/' }];
  if (data.module) crumbs.push({ label: data.module, hash: `#/module/MOD-${data.module.toUpperCase()}` });
  crumbs.push({ label: data.id, hash: `#/node/${id}` });
  setBreadcrumbs(crumbs);

  const rulesHtml = data.rules?.length ? `
    <h2 class="text-lg font-semibold mb-3">Rules</h2>
    ${renderTable(
      [
        { label: 'ID', render: (r) => `<span class="font-mono text-xs">${r.id}</span>` },
        { label: 'Title', render: (r) => r.title || '—' },
        { label: 'Constraint', render: (r) => `<span class="text-xs">${r.constraint || '—'}</span>` },
      ],
      data.rules,
    )}` : '';

  const edgesHtml = Object.entries(data.edges || {})
    .map(([label, items]) => {
      const rows = items.map((e) => ({
        target: e.target,
        id: e.id,
        kind: e.kind,
        name: e.name,
        status: e.status,
        hash: `#/node/${e.id}`,
      }));
      return `<div class="mb-4">
        <h3 class="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">${label} (${items.length})</h3>
        ${renderTable(
          [
            { label: 'Target', render: (r) => `<span class="font-mono text-xs">${r.target}</span>` },
            { label: 'Kind', render: (r) => r.kind || '—' },
            { label: 'Name', render: (r) => r.name || '—' },
            { label: 'Status', render: (r) => statusPill(r.status) },
            { label: '', render: (r) => viewBtn(r.hash, 'Go deeper') },
          ],
          rows,
        )}
      </div>`;
    })
    .join('');

  content.innerHTML = `
    <div class="mb-6 flex flex-wrap items-start gap-3">
      <div>
        <h2 class="text-2xl font-semibold font-mono">${data.id}</h2>
        <p class="text-sm text-slate-500 mt-1">${data.kind}${data.subtype ? ` · ${data.subtype}` : ''}</p>
      </div>
      ${statusPill(data.status)}
    </div>
    ${renderFields(data)}
    ${renderSpecBlock(data.spec)}
    ${rulesHtml}
    ${edgesHtml ? `<h2 class="text-lg font-semibold mb-3 mt-6">Edges</h2>${edgesHtml}` : ''}
    ${data.source ? `<p class="text-xs text-slate-500 mt-6">Source: <span class="font-mono">${data.source}</span></p>` : ''}`;
}

// ── Router ─────────────────────────────────────────────────────────────────────
async function route() {
  const r = parseRoute();
  try {
    if (r.view === 'overview') await renderOverview();
    else if (r.view === 'module') await renderModule(r.id);
    else if (r.view === 'feature') await renderFeature(r.id);
    else if (r.view === 'node') await renderNode(r.id);
  } catch (e) {
    content.innerHTML = `<p class="text-red-600">Error: ${e.message}</p>`;
  }
}

// ── Toolbar actions ────────────────────────────────────────────────────────────
function openDrawer() {
  verifyDrawer.classList.remove('translate-x-full');
  drawerBackdrop.classList.remove('hidden');
}

function closeDrawer() {
  verifyDrawer.classList.add('translate-x-full');
  drawerBackdrop.classList.add('hidden');
}

function renderVerifyReport(report) {
  const statusColor = report.status === 'PASS' ? 'text-emerald-600' : 'text-red-600';
  let html = `<div class="mb-4"><span class="text-2xl font-bold ${statusColor}">${report.status}</span></div>`;
  if (report.checks) {
    html += `<div class="mb-4"><h3 class="text-xs uppercase text-slate-500 mb-2">Checks</h3>
      <pre class="text-xs font-mono bg-slate-50 border border-slate-200 rounded p-3 overflow-x-auto text-slate-700">${JSON.stringify(report.checks, null, 2)}</pre></div>`;
  }
  if (report.errors?.length) {
    html += `<div class="mb-4"><h3 class="text-xs uppercase text-red-600 mb-2">Errors (${report.errors.length})</h3>
      <ul class="space-y-1">${report.errors.map((e) => `<li class="text-xs text-red-700 font-mono">× ${e}</li>`).join('')}</ul></div>`;
  }
  if (report.warnings?.length) {
    html += `<div class="mb-4"><h3 class="text-xs uppercase text-amber-600 mb-2">Warnings (${report.warnings.length})</h3>
      <ul class="space-y-1">${report.warnings.map((w) => `<li class="text-xs text-amber-700 font-mono">! ${w}</li>`).join('')}</ul></div>`;
  }
  if (report.summary) {
    html += `<div><h3 class="text-xs uppercase text-slate-500 mb-2">Summary</h3>
      <pre class="text-xs font-mono bg-slate-50 border border-slate-200 rounded p-3 text-slate-700">${JSON.stringify(report.summary, null, 2)}</pre></div>`;
  }
  return html;
}

$('#btn-refresh').addEventListener('click', async () => {
  $('#btn-refresh').disabled = true;
  $('#btn-refresh').textContent = 'Refreshing…';
  try {
    const data = await api('/api/refresh', { method: 'POST' });
    verifyBadgePill(data.overview?.verifyStatus);
    await route();
  } catch (e) {
    alert('Refresh failed: ' + e.message);
  } finally {
    $('#btn-refresh').disabled = false;
    $('#btn-refresh').textContent = 'Refresh';
  }
});

$('#btn-verify').addEventListener('click', async () => {
  $('#btn-verify').disabled = true;
  $('#btn-verify').textContent = 'Verifying…';
  try {
    const data = await api('/api/verify', { method: 'POST' });
    verifyBadgePill(data.report?.status);
    verifyDrawerBody.innerHTML = renderVerifyReport(data.report);
    openDrawer();
    await route();
  } catch (e) {
    alert('Verify failed: ' + e.message);
  } finally {
    $('#btn-verify').disabled = false;
    $('#btn-verify').textContent = 'Verify';
  }
});

$('#close-drawer').addEventListener('click', closeDrawer);
drawerBackdrop.addEventListener('click', closeDrawer);

window.addEventListener('hashchange', route);
route();

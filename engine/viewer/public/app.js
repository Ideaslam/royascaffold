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

// ── Kind descriptions (loaded once) ───────────────────────────────────────────
let KINDS = {};

function kindDesc(kind) {
  return KINDS[kind] || null;
}

function kindTip(kind) {
  const k = kindDesc(kind);
  return k?.short ? ` title="${k.short.replace(/"/g, '&quot;')}"` : '';
}

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
  if (parts[0] === 'data') return { view: 'data' };
  if (parts[0] === 'app' && parts[1]) return { view: 'app', id: parts[1] };
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

function esc(v) {
  if (v == null) return '';
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

function renderDoc(doc) {
  if (!doc) return '';
  const rules = Array.isArray(doc.rules) ? doc.rules : (doc.rules ? [doc.rules] : []);
  return `<div class="rounded-lg border border-slate-200 bg-white shadow-sm p-4 mb-6">
    ${doc.short ? `<p class="text-sm font-semibold text-slate-800">${doc.short}</p>` : ''}
    ${doc.description ? `<p class="text-sm text-slate-600 mt-1 leading-relaxed whitespace-pre-wrap">${doc.description}</p>` : ''}
    ${rules.length ? `<div class="mt-3">
      <h3 class="text-xs uppercase text-slate-500 mb-1">Constraints</h3>
      <ul class="list-disc list-inside text-sm text-slate-700 space-y-1">${rules.map((r) => `<li>${r}</li>`).join('')}</ul>
    </div>` : ''}
  </div>`;
}

function nodeLink(id, label) {
  return `<button onclick="location.hash='#/node/${id}'" class="font-mono text-indigo-600 hover:text-indigo-800 text-xs">${label || id}</button>`;
}

// ── App / repository badges ────────────────────────────────────────────────────
function appSideClass(side) {
  if (side === 'backend') return 'bg-violet-50 text-violet-700 border-violet-200';
  if (side === 'frontend') return 'bg-teal-50 text-teal-700 border-teal-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

function appBadge(a) {
  const repoTip = a.repo ? ` title="${esc(a.repo)}"` : '';
  return `<button onclick="location.hash='#/app/${a.key}'"${repoTip} class="inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${appSideClass(a.side)} hover:opacity-80 transition">${esc(a.label || a.key)}</button>`;
}

function appBadges(apps) {
  if (!apps?.length) return '<span class="text-slate-400 text-xs">unassigned</span>';
  return `<span class="inline-flex flex-wrap gap-1 align-middle">${apps.map(appBadge).join('')}</span>`;
}

function appRow(label, apps) {
  return `<div class="mb-4 flex items-center gap-2"><span class="text-xs uppercase text-slate-500">${label}</span>${appBadges(apps)}</div>`;
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

function renderAppCards(apps) {
  if (!apps?.length) return '';
  return `<div class="mb-6">
    <h2 class="text-lg font-semibold mb-3">Apps / Repositories <span class="text-slate-500 text-sm font-normal">(${apps.length})</span></h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      ${apps.map((a) => `<button onclick="location.hash='#/app/${a.key}'" class="text-left rounded-lg border border-slate-200 bg-white shadow-sm px-4 py-3 hover:border-indigo-300 hover:shadow transition">
        <div class="flex items-center justify-between gap-2">
          <span class="font-semibold text-slate-800 truncate">${esc(a.label)}</span>
          <span class="shrink-0 text-xs px-1.5 py-0.5 rounded border ${appSideClass(a.side)}">${esc(a.side || '')}</span>
        </div>
        <div class="text-xs text-slate-500 mt-1 font-mono truncate">${esc(a.repo || '')}</div>
        <div class="text-xs text-slate-400 mt-0.5 truncate">${esc(a.framework || '')}</div>
        <div class="flex items-baseline gap-1 mt-2"><span class="text-2xl font-semibold text-indigo-600">${a.nodeCount}</span><span class="text-xs text-slate-500">nodes</span></div>
      </button>`).join('')}
    </div>
  </div>`;
}

function renderKindBreakdown(totals) {
  const rows = Object.entries(totals || {})
    .sort((a, b) => b[1] - a[1])
    .map(([kind, count]) => ({ kind, count, short: kindDesc(kind)?.short || '' }));
  return renderTable(
    [
      { label: 'Kind', render: (r) => `<span class="font-medium">${r.kind}</span>` },
      { label: 'What it is', render: (r) => `<span class="text-xs text-slate-500">${r.short || '—'}</span>` },
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
  populateAppJump(data.apps);

  const moduleRows = data.modules.map((m) => ({
    ...m,
    hash: `#/module/${m.id}`,
  }));

  content.innerHTML = `
    ${renderStats(data.totals, data.statusRollup, data.backlogCount)}
    ${renderAppCards(data.apps)}
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
      const short = kindDesc(kind)?.short;
      return `<div class="mb-6">
        <h3 class="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-0.5">${kind} <span class="text-slate-400 font-normal">(${items.length})</span></h3>
        ${short ? `<p class="text-xs text-slate-500 mb-2">${short}</p>` : '<div class="mb-2"></div>'}
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
    <div class="mb-2 flex flex-wrap items-start gap-4">
      <div>
        <h2 class="text-2xl font-semibold">${data.name}</h2>
        <p class="font-mono text-sm text-slate-500 mt-1">${data.id}</p>
      </div>
      <div class="flex gap-2 items-center">
        ${statusPill(data.status)}
        ${data.owner ? `<span class="text-sm text-slate-500">Owner: ${nodeLink(data.owner, data.owner)}</span>` : ''}
      </div>
    </div>
    ${kindDesc('module')?.short ? `<p class="text-sm text-slate-500 mb-4">${kindDesc('module').short}</p>` : ''}
    ${appRow('Ships in', data.apps)}
    ${data.reason ? `<p class="text-sm text-amber-800 mb-4 border border-amber-200 rounded-lg px-3 py-2 bg-amber-50">${data.reason}</p>` : ''}
    ${renderDoc(data.doc)}

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
    ${kindSections || '<p class="text-slate-500 text-sm">No components.</p>'}

    <h2 class="text-lg font-semibold mt-8 mb-1">Entities used <span class="text-slate-500 text-sm font-normal">(${(data.entitiesUsed || []).length})</span></h2>
    <p class="text-xs text-slate-500 mb-3">Domain-owned entities this module's logic reads or writes. Definitions live in <span class="font-mono">map/data/</span>.</p>
    ${renderTable(
      [
        { label: 'Entity', render: (r) => `<span class="font-mono text-xs">${r.id}</span>` },
        { label: 'Collection', render: (r) => r.name || '—' },
        { label: 'Domain', render: (r) => r.domain ? nodeLink(r.domain, r.domain) : '—' },
        { label: 'Status', render: (r) => statusPill(r.status) },
        { label: '', render: (r) => viewBtn(`#/node/${r.id}`) },
      ],
      (data.entitiesUsed || []),
      'This module uses no entities directly.',
    )}`;
}

async function renderDataModel() {
  setBreadcrumbs([
    { label: 'System', hash: '#/' },
    { label: 'Data Model', hash: '#/data' },
  ]);
  content.innerHTML = '<div class="text-slate-500 py-12 text-center">Loading data model…</div>';

  const data = await api('/api/data-model');
  const sections = data.domains.map((d) => {
    const rows = d.entities.map((e) => ({ ...e, hash: `#/node/${e.id}` }));
    return `<div class="mb-8">
      <h3 class="text-base font-semibold text-slate-800">${esc(d.name)} <span class="text-slate-400 font-normal text-sm">(${d.entities.length})</span></h3>
      ${d.doc?.short ? `<p class="text-xs text-slate-500 mb-2">${esc(d.doc.short)}</p>` : '<div class="mb-2"></div>'}
      ${renderTable(
        [
          { label: 'Entity', render: (r) => `<span class="font-mono text-xs">${r.id}</span>` },
          { label: 'Collection', render: (r) => `<span class="font-mono text-xs text-slate-600">${esc(r.collection) || '—'}</span>` },
          { label: 'Fields', render: (r) => r.fieldCount || 0 },
          { label: 'Relations', render: (r) => r.relations ? `<span class="text-xs text-slate-500">${esc(r.relations)}</span>` : '—' },
          { label: 'Src', render: (r) => r.inferred ? '<span class="text-xs text-amber-600">inferred</span>' : '<span class="text-xs text-slate-400">doc</span>' },
          { label: '', render: (r) => viewBtn(r.hash) },
        ],
        rows,
        'No entities in this domain.',
      )}
    </div>`;
  }).join('');

  content.innerHTML = `
    <div class="mb-6">
      <h2 class="text-2xl font-semibold">Data Model</h2>
      <p class="text-sm text-slate-500 mt-1">${data.total} entities across ${data.domains.length} domains. Each entity is owned by one domain and shared across modules via logic.</p>
    </div>
    ${sections || '<p class="text-slate-500 text-sm">No entities.</p>'}`;
}

async function renderApp(key) {
  setBreadcrumbs([
    { label: 'System', hash: '#/' },
    { label: `App: ${key}`, hash: `#/app/${key}` },
  ]);
  content.innerHTML = '<div class="text-slate-500 py-12 text-center">Loading app…</div>';

  const data = await api(`/api/app/${key}`);
  if (!data) { content.innerHTML = '<p class="text-red-600">App not found.</p>'; return; }

  setBreadcrumbs([
    { label: 'System', hash: '#/' },
    { label: data.label, hash: `#/app/${key}` },
  ]);

  const modSections = data.modules.map((m) => {
    const kinds = Object.entries(m.byKind)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([kind, items]) => `<div class="mb-3">
        <h4 class="text-xs font-semibold uppercase text-slate-500 mb-1">${kind} <span class="text-slate-400 font-normal">(${items.length})</span></h4>
        ${renderTable(
          [
            { label: 'ID', render: (r) => `<span class="font-mono text-xs">${r.id}</span>` },
            { label: 'Name', render: (r) => r.name || '—' },
            { label: 'Subtype', render: (r) => r.subtype || '—' },
            { label: 'Status', render: (r) => statusPill(r.status) },
            { label: '', render: (r) => viewBtn(`#/node/${r.id}`) },
          ],
          items,
        )}
      </div>`).join('');
    const modLabel = m.moduleId
      ? `<button onclick="location.hash='#/module/${m.moduleId}'" class="text-indigo-600 hover:underline">${esc(m.module)}</button>`
      : esc(m.module);
    return `<div class="mb-6 rounded-lg border border-slate-200 bg-white shadow-sm p-4">
      <h3 class="text-base font-semibold text-slate-800 mb-3">${modLabel} <span class="text-slate-400 font-normal text-sm">(${m.count})</span></h3>
      ${kinds}
    </div>`;
  }).join('');

  content.innerHTML = `
    <div class="mb-6 flex flex-wrap items-start gap-3">
      <div>
        <h2 class="text-2xl font-semibold">${esc(data.label)}</h2>
        <p class="text-sm text-slate-500 mt-1"><span class="font-mono">${esc(data.repo || '')}</span>${data.framework ? ` · ${esc(data.framework)}` : ''}</p>
      </div>
      <span class="text-xs px-2 py-0.5 rounded border ${appSideClass(data.side)}">${esc(data.side || '')}</span>
    </div>
    <p class="text-sm text-slate-500 mb-6">${data.total} implementation nodes across ${data.modules.length} modules.</p>
    ${modSections || '<p class="text-slate-500 text-sm">No nodes assigned to this app.</p>'}`;
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
    <div class="mb-4">
      <h2 class="text-2xl font-semibold">${data.name}</h2>
      <p class="font-mono text-sm text-slate-500 mt-1">${data.id}</p>
      <div class="flex gap-2 mt-2">${statusPill(data.status)}</div>
      ${kindDesc('feature')?.short ? `<p class="text-sm text-slate-500 mt-2">${kindDesc('feature').short}</p>` : ''}
    </div>
    ${appRow('Surfaces in', data.apps)}
    ${renderDoc(data.doc)}
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

function renderFieldsTable(fields) {
  return renderTable(
    [
      { label: 'Field', render: (f) => `<span class="font-mono text-xs text-slate-800">${esc(f.name)}</span>` },
      { label: 'Type', render: (f) => `<span class="text-xs font-mono text-slate-600">${esc(f.type) || '—'}</span>` },
      { label: 'Req', render: (f) => f.required ? '<span class="text-emerald-600 text-xs">required</span>' : '<span class="text-slate-400 text-xs">optional</span>' },
      { label: 'Ref', render: (f) => f.ref ? nodeLink(f.ref, f.ref) : '<span class="text-slate-300">—</span>' },
      { label: 'Index', render: (f) => f.index ? `<span class="text-xs font-mono text-sky-700">${f.index === true ? 'yes' : esc(f.index)}</span>` : '<span class="text-slate-300">—</span>' },
      { label: 'Enum', render: (f) => Array.isArray(f.enum) ? `<span class="text-xs font-mono text-slate-500">${f.enum.map(esc).join(' | ')}</span>` : '<span class="text-slate-300">—</span>' },
      { label: 'Constraints', render: (f) => f.constraints ? `<span class="text-xs text-slate-500">${esc(f.constraints)}</span>` : '<span class="text-slate-300">—</span>' },
    ],
    fields || [],
    'No fields defined.',
  );
}

function labeledBox(label, inner) {
  return `<div class="rounded-lg border border-slate-200 bg-white shadow-sm p-4 mb-4">
    <h3 class="text-xs uppercase text-slate-500 mb-2">${label}</h3>${inner}</div>`;
}

function renderDataSpec(spec) {
  const parts = [];
  parts.push(`<h2 class="text-lg font-semibold mb-3">Fields <span class="text-slate-500 text-sm font-normal">(${(spec.fields || []).length})</span></h2>`);
  parts.push(renderFieldsTable(spec.fields));
  if (spec.relations) {
    parts.push(labeledBox('Relations', `<p class="text-sm text-slate-700 leading-relaxed">${esc(spec.relations)}</p>`));
  }
  if (spec.indexes?.length) {
    parts.push(labeledBox('Indexes', `<ul class="list-disc list-inside text-sm text-slate-700 space-y-1">${spec.indexes.map((i) => `<li class="font-mono text-xs">${esc(i)}</li>`).join('')}</ul>`));
  }
  if (spec.enums && Object.keys(spec.enums).length) {
    const rows = Object.entries(spec.enums).map(([k, vals]) => `<li><span class="font-mono text-xs text-slate-800">${esc(k)}</span>: <span class="font-mono text-xs text-slate-500">${(Array.isArray(vals) ? vals : [vals]).map(esc).join(' | ')}</span></li>`).join('');
    parts.push(labeledBox('Enums', `<ul class="space-y-1">${rows}</ul>`));
  }
  if (spec.notes) parts.push(labeledBox('Notes', `<p class="text-sm text-slate-600">${esc(spec.notes)}</p>`));
  if (spec.source) parts.push(`<p class="text-xs text-amber-700 mb-4">Field definitions are <span class="font-medium">${esc(spec.source)}</span> (validate against code/schema).</p>`);
  return parts.join('');
}

function renderShape(shape) {
  if (shape == null) return '<span class="text-slate-400 text-xs">—</span>';
  if (typeof shape === 'string') {
    return /^(ENT|DTO)-/.test(shape) ? nodeLink(shape, shape) : `<span class="text-xs font-mono text-slate-600">${esc(shape)}</span>`;
  }
  return `<pre class="text-xs font-mono text-slate-700 bg-slate-50 rounded p-2 overflow-x-auto whitespace-pre-wrap">${esc(JSON.stringify(shape, null, 2))}</pre>`;
}

function renderSurfaceSpec(spec) {
  const parts = [];
  if (spec.request) parts.push(labeledBox('Request', renderShape(spec.request)));
  if (spec.response) parts.push(labeledBox('Response', renderShape(spec.response)));
  if (spec.errors?.length) {
    parts.push(labeledBox('Errors', renderTable(
      [
        { label: 'Code', render: (e) => `<span class="font-mono text-xs">${esc(e.code)}</span>` },
        { label: 'When', render: (e) => `<span class="text-xs text-slate-600">${esc(e.when)}</span>` },
      ],
      spec.errors,
      'No errors documented.',
    )));
  }
  if (spec.narrative) parts.push(labeledBox('Narrative', `<p class="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">${esc(spec.narrative)}</p>`));
  return parts.join('');
}

function renderSpec(node) {
  const spec = node.spec;
  if (!spec) return '';
  if (node.kind === 'data') return renderDataSpec(spec);
  if (node.kind === 'surface' && (spec.request || spec.response || spec.errors)) return renderSurfaceSpec(spec);
  return `<div class="rounded-lg border border-slate-200 bg-white shadow-sm p-4 mb-4">
    <h3 class="text-xs uppercase text-slate-500 mb-2">Spec</h3>
    <pre class="text-xs font-mono text-slate-700 bg-slate-50 rounded p-3 overflow-x-auto whitespace-pre-wrap">${esc(JSON.stringify(spec, null, 2))}</pre>
  </div>`;
}

function renderFields(obj) {
  const skip = new Set(['id', 'spec', 'source', 'rules', 'edges', 'doc', 'kindInfo']);
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

  const ki = data.kindInfo || kindDesc(data.kind);
  const kindBox = ki ? `
    <div class="rounded-lg border border-indigo-100 bg-indigo-50/60 p-4 mb-4">
      <h3 class="text-xs uppercase text-indigo-700 font-semibold mb-1">Kind · ${data.kind}</h3>
      ${ki.short ? `<p class="text-sm text-slate-800 font-medium">${ki.short}</p>` : ''}
      ${ki.long ? `<p class="text-sm text-slate-600 mt-1 leading-relaxed">${ki.long}</p>` : ''}
    </div>` : '';

  content.innerHTML = `
    <div class="mb-4 flex flex-wrap items-start gap-3">
      <div>
        <h2 class="text-2xl font-semibold font-mono">${data.id}</h2>
        <p class="text-sm text-slate-500 mt-1">${data.kind}${data.subtype ? ` · ${data.subtype}` : ''}</p>
      </div>
      ${statusPill(data.status)}
    </div>
    ${kindBox}
    ${appRow('Apps / repos', data.apps)}
    ${renderDoc(data.doc)}
    ${renderFields(data)}
    ${renderSpec(data)}
    ${rulesHtml}
    ${edgesHtml ? `<h2 class="text-lg font-semibold mb-3 mt-6">Edges</h2>${edgesHtml}` : ''}
    ${data.source ? `<p class="text-xs text-slate-500 mt-6">Source: <span class="font-mono">${data.source}</span></p>` : ''}`;
}

// ── Router ─────────────────────────────────────────────────────────────────────
async function route() {
  const r = parseRoute();
  try {
    if (r.view === 'overview') await renderOverview();
    else if (r.view === 'data') await renderDataModel();
    else if (r.view === 'app') await renderApp(r.id);
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

let _appJumpFilled = false;
function populateAppJump(apps) {
  const sel = $('#app-jump');
  if (!sel || _appJumpFilled || !apps?.length) return;
  for (const a of apps) {
    const opt = document.createElement('option');
    opt.value = a.key;
    opt.textContent = a.label || a.key;
    sel.appendChild(opt);
  }
  _appJumpFilled = true;
}
$('#app-jump')?.addEventListener('change', (e) => {
  if (e.target.value) { location.hash = `#/app/${e.target.value}`; e.target.value = ''; }
});

$('#close-drawer').addEventListener('click', closeDrawer);
drawerBackdrop.addEventListener('click', closeDrawer);

window.addEventListener('hashchange', route);

(async function init() {
  try {
    KINDS = await api('/api/kinds');
  } catch (e) {
    KINDS = {};
  }
  try {
    const ov = await api('/api/overview');
    populateAppJump(ov.apps);
  } catch (e) { /* dropdown stays empty */ }
  route();
})();

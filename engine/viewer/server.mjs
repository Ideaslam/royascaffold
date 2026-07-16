#!/usr/bin/env node
// Roya System Viewer — read-only web UI for the map YAML.

import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { generateIndex } from '../verify/index.mjs';
import { verify } from '../verify/verify.mjs';
import { overview, moduleView, featureView, nodeView, graphStub, kindsInfo } from './model.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, 'public');

const projectDir = process.argv[2] || 'project';
const portArg = process.argv.find((a) => a.startsWith('--port='));
const PORT = Number(process.env.PORT || (portArg ? portArg.split('=')[1] : 7420));

const app = express();
app.use(express.json());

function sendOr404(res, data) {
  if (!data) return res.status(404).json({ error: 'Not found' });
  return res.json(data);
}

app.get('/api/overview', (_req, res) => {
  res.json(overview(projectDir));
});

app.get('/api/module/:id', (req, res) => {
  sendOr404(res, moduleView(projectDir, req.params.id));
});

app.get('/api/feature/:id', (req, res) => {
  sendOr404(res, featureView(projectDir, req.params.id));
});

app.get('/api/node/:id', (req, res) => {
  sendOr404(res, nodeView(projectDir, req.params.id));
});

app.post('/api/refresh', (_req, res) => {
  generateIndex(projectDir);
  res.json({ ok: true, overview: overview(projectDir) });
});

app.post('/api/verify', (_req, res) => {
  generateIndex(projectDir);
  const report = verify(projectDir);
  res.json({ ok: true, report, overview: overview(projectDir) });
});

app.get('/api/graph', (_req, res) => {
  res.json(graphStub(projectDir));
});

app.get('/api/kinds', (_req, res) => {
  res.json(kindsInfo());
});

app.use(express.static(publicDir));

app.get('*', (_req, res) => {
  res.sendFile(join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Roya System Viewer: http://localhost:${PORT}`);
  console.log(`Project: ${projectDir}`);
});

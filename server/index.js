#!/usr/bin/env node
// Lightweight proxy to Fairbrix RPC and external APIs, CORS enabled.
// No dependencies.

const http = require('http');
const https = require('https');
const fs = require('fs');
const { URL } = require('url');

const PORT = process.env.DOPEBRIX_PROXY_PORT ? parseInt(process.env.DOPEBRIX_PROXY_PORT, 10) : 8089;
let FAIRBRIX = process.env.DOPEBRIX_FAIRBRIX_RPC || 'http://127.0.0.1:9332/';
let RPC_AUTH = process.env.DOPEBRIX_RPC_AUTH || '';
const COOKIE_PATH = process.env.DOPEBRIX_COOKIE_PATH || '';
const UNISAT_API_BASE = process.env.DOPEBRIX_UNISAT_API_BASE || 'http://localhost:8090';
const ORDINALS_API_BASE = process.env.DOPEBRIX_ORDINALS_API_BASE || 'http://localhost:8091';
const RUNES_API_BASE = process.env.DOPEBRIX_RUNES_API_BASE || 'http://localhost:8092';

function readCookieBase64() {
  try {
    if (!COOKIE_PATH) return '';
    const val = fs.readFileSync(COOKIE_PATH, 'utf8').trim();
    const hdr = Buffer.from(val).toString('base64');
    return hdr;
  } catch { return ''; }
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-dbx-rpc-url,x-dbx-rpc-auth');
}

function body(req) {
  return new Promise((resolve) => {
    let data=''; req.on('data', (c)=> data+=c); req.on('end', ()=> resolve(data));
  });
}

function forward(target, path, method, headers, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(path || '/', target);
    const h = { ...headers };
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request({ method, hostname: url.hostname, port: url.port || (url.protocol==='https:'?443:80), path: url.pathname + url.search, headers: h }, (res) => {
      let body='';
      res.on('data', (c)=> body+=c);
      res.on('end', ()=> resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (req.url === '/config' && req.method === 'GET') {
    res.setHeader('content-type','application/json');
    return res.end(JSON.stringify({ FAIRBRIX, hasAuth: !!(RPC_AUTH || COOKIE_PATH), UNISAT_API_BASE, ORDINALS_API_BASE, RUNES_API_BASE }));
  }

  if (req.url === '/health' && req.method === 'GET') {
    const out = { proxy: true, fairbrix: { ok: false }, unisat: { ok: false }, ordinals: { ok: false }, runes: { ok: false } };
    // Check Fairbrix RPC
    try {
      const auth = RPC_AUTH || readCookieBase64();
      const headers = { 'content-type': 'application/json' };
      if (auth) headers['Authorization'] = `Basic ${auth}`;
      const body = JSON.stringify({ jsonrpc: '1.0', id: 'health', method: 'getblockchaininfo', params: [] });
      const r = await forward(FAIRBRIX, '/', 'POST', headers, body);
      if ((r.status||200) < 500) out.fairbrix.ok = true;
    } catch {}
    // Check UniSat base
    try {
      const r = await forward(UNISAT_API_BASE, '/', 'GET', {}, null);
      if ((r.status||200) < 500) out.unisat.ok = true;
    } catch {}
    // Check Ordinals
    try {
      const r = await forward(ORDINALS_API_BASE, '/', 'GET', {}, null);
      if ((r.status||200) < 500) out.ordinals.ok = true;
    } catch {}
    // Check Runes
    try {
      const r = await forward(RUNES_API_BASE, '/', 'GET', {}, null);
      if ((r.status||200) < 500) out.runes.ok = true;
    } catch {}
    res.setHeader('content-type','application/json');
    return res.end(JSON.stringify(out));
  }

  if (req.url === '/rpc' && req.method === 'POST') {
    const raw = await body(req);
    // Optional per-request override via headers
    const hdrRpc = req.headers['x-dbx-rpc-url'];
    const hdrAuth = req.headers['x-dbx-rpc-auth'];
    const target = hdrRpc || FAIRBRIX;
    const auth = hdrAuth || RPC_AUTH || readCookieBase64();
    const headers = { 'content-type': 'application/json' };
    if (auth) headers['Authorization'] = `Basic ${auth}`;
    try {
      const out = await forward(target, '/', 'POST', headers, raw);
      res.writeHead(out.status || 200, { 'content-type': 'application/json' });
      return res.end(out.body);
    } catch (e) {
      res.writeHead(502, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ error: 'rpc_forward_failed' }));
    }
  }

  // UniSat-like endpoints
  if (req.url.startsWith('/unisat/')) {
    const path = req.url.replace('/unisat','');
    const raw = req.method === 'POST' ? await body(req) : null;
    try {
      const out = await forward(UNISAT_API_BASE, path, req.method, { 'content-type': 'application/json' }, raw);
      res.writeHead(out.status || 200, { 'content-type': out.headers['content-type'] || 'application/json' });
      return res.end(out.body);
    } catch { res.writeHead(502); return res.end(''); }
  }

  if (req.url.startsWith('/ordinals/')) {
    const path = req.url.replace('/ordinals','');
    const raw = req.method === 'POST' ? await body(req) : null;
    try {
      const out = await forward(ORDINALS_API_BASE, path, req.method, { 'content-type': 'application/json' }, raw);
      res.writeHead(out.status || 200, { 'content-type': out.headers['content-type'] || 'application/json' });
      return res.end(out.body);
    } catch { res.writeHead(502); return res.end(''); }
  }

  if (req.url.startsWith('/runes/')) {
    const path = req.url.replace('/runes','');
    const raw = req.method === 'POST' ? await body(req) : null;
    try {
      const out = await forward(RUNES_API_BASE, path, req.method, { 'content-type': 'application/json' }, raw);
      res.writeHead(out.status || 200, { 'content-type': out.headers['content-type'] || 'application/json' });
      return res.end(out.body);
    } catch { res.writeHead(502); return res.end(''); }
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`[DopeBrix] Proxy on http://127.0.0.1:${PORT}`);
  console.log(`[DopeBrix] Fairbrix RPC: ${FAIRBRIX}`);
});

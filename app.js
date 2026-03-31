'use strict';

const DEFAULT_BASE = 'https://deftrack.xyz/api/v1';

let running = false;
let passed = 0, failed = 0, skipped = 0;

function qs(sel) { return document.querySelector(sel); }
function setStatus(msg) { qs('#runStatus').textContent = msg; }
function setCurrent(ep)  { qs('#currentEndpoint').textContent = ep || '-'; }
function setSummary()    { qs('#summary').textContent = `${passed} / ${failed} / ${skipped}`; }

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderCard(num, label, status, result) {
  const badgeClass = { pending: 'pending', running: 'running', ok: 'ok', skip: 'pending', bad: 'bad' }[status] ?? 'pending';
  const badgeText  = { pending: 'Pending', running: 'Running…', ok: `OK ${result?.status ?? ''}`, skip: 'Skipped', bad: `Error ${result?.status ?? ''}` }[status] ?? status;

  let body = '';
  if (result) {
    const preview = result.json != null
      ? JSON.stringify(result.json, null, 2)
      : result.text ?? '';
    body = `
      <div class="result-meta">${escHtml(result.url)}</div>
      <div class="response-box"><pre>${escHtml(preview.slice(0, 3000))}</pre></div>`;
  }

  return `<div class="result-card" id="card-${num}">
    <div class="result-head">
      <span class="endpoint-number">${num}</span>
      <span class="endpoint-path">${escHtml(label)}</span>
      <span class="badge ${badgeClass}">${badgeText}</span>
    </div>${body}
  </div>`;
}

function updateCard(num, label, status, result) {
  const el = document.getElementById(`card-${num}`);
  if (el) el.outerHTML = renderCard(num, label, status, result);
}

async function fetchEndpoint(url) {
  const r = await fetch(url);
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) {}
  return { ok: r.ok, status: r.status, url, json, text };
}

async function run() {
  if (running) return;
  running = true;
  passed = 0; failed = 0; skipped = 0;

  const base = (qs('#baseUrl').value.trim() || DEFAULT_BASE).replace(/\/+$/, '');
  let address     = qs('#addressInput').value.trim();
  let masternodeId = qs('#masternodeInput').value.trim();

  const endpoints = [
    { id: 'stats',       path: '/stats' },
    { id: 'market',      path: '/market' },
    { id: 'masternodes', path: '/masternodes' },
    { id: 'blocks',      path: '/blocks/latest?count=5' },
    { id: 'txs',         path: '/txs/latest?count=5' },
    { id: 'richlist',    path: '/richlist?page=1&limit=5' },
    { id: 'address',     path: null, needsAddress: true,     label: '/address/{addr}' },
    { id: 'masternode',  path: null, needsMasternode: true,  label: '/masternode/{id}' },
  ];

  const btn = qs('#runButton');
  btn.disabled = true;

  qs('#resultsList').innerHTML = endpoints
    .map((ep, i) => renderCard(i + 1, ep.label ?? ep.path, 'pending', null))
    .join('');

  setStatus('Running…');
  setSummary();

  for (let i = 0; i < endpoints.length; i++) {
    const ep  = endpoints[i];
    const num = i + 1;
    const displayLabel = ep.label ?? ep.path;

    updateCard(num, displayLabel, 'running', null);
    setCurrent(displayLabel);

    if (ep.needsAddress && !address) {
      skipped++; setSummary();
      updateCard(num, displayLabel, 'skip', null);
      continue;
    }
    if (ep.needsMasternode && !masternodeId) {
      skipped++; setSummary();
      updateCard(num, displayLabel, 'skip', null);
      continue;
    }

    let path = ep.path;
    if (ep.needsAddress)     path = `/address/${encodeURIComponent(address)}`;
    if (ep.needsMasternode)  path = `/masternode/${encodeURIComponent(masternodeId)}`;

    try {
      const res = await fetchEndpoint(base + path);

      // Auto-discover address from richlist response
      if (ep.id === 'richlist' && !qs('#addressInput').value.trim() && res.json) {
        const list = res.json.data ?? res.json;
        if (Array.isArray(list) && list[0]?.address) {
          address = list[0].address;
          qs('#addressInput').value = address;
        }
      }
      // Auto-discover masternode ID
      if (ep.id === 'masternodes' && !qs('#masternodeInput').value.trim() && res.json) {
        const nodes = res.json.data?.nodes ?? res.json.nodes ?? res.json.data ?? res.json;
        if (Array.isArray(nodes) && nodes[0]) {
          const id = nodes[0].masternodeid ?? nodes[0].id ?? nodes[0].txid;
          if (id) { masternodeId = id; qs('#masternodeInput').value = id; }
        }
      }

      if (res.ok) passed++; else failed++;
      setSummary();
      updateCard(num, `${displayLabel}  →  ${path}`, res.ok ? 'ok' : 'bad', res);
    } catch (e) {
      failed++; setSummary();
      updateCard(num, displayLabel, 'bad', { ok: false, status: 0, url: base + path, json: null, text: e.message });
    }
  }

  setCurrent('—');
  setStatus(`Done — ${passed} passed, ${failed} failed, ${skipped} skipped.`);
  btn.disabled = false;
  running = false;
}

qs('#baseUrl').value = DEFAULT_BASE;
qs('#runButton').addEventListener('click', run);
run();

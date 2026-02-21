'use strict';

const API        = 'https://deftrack.xyz/api';
const REFRESH_MS = 30_000;

// ── Formatters ────────────────────────────────────────────────

function fmt(n, dec = 2) {
  if (n == null || n === '') return '—';
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: dec });
}

function fmtSupply(n) {
  if (n == null) return '—';
  const b = n / 1e9;
  if (b >= 1) return `${b.toFixed(2)}B DFC`;
  const m = n / 1e6;
  if (m >= 1) return `${m.toFixed(2)}M DFC`;
  return `${fmt(n, 0)} DFC`;
}

function fmtShort(h, len = 12) {
  if (!h) return '—';
  const s = String(h);
  if (s.length <= len) return s;
  return `${s.slice(0, len)}…`;
}

function fmtAge(ts) {
  if (!ts) return '—';
  const sec = Math.floor(Date.now() / 1000) - Number(ts);
  if (sec < 0)    return 'just now';
  if (sec < 60)   return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400)return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function fmtHashrate(h) {
  if (!h) return '—';
  const units = ['H/s','KH/s','MH/s','GH/s','TH/s','PH/s','EH/s'];
  let v = Number(h), i = 0;
  while (v >= 1000 && i < units.length - 1) { v /= 1000; i++; }
  return `${v.toFixed(2)} ${units[i]}`;
}

function fmtBytes(b) {
  if (!b) return '0 B';
  b = Number(b);
  if (b < 1024)    return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(2)} MB`;
}

function fmtPrice(n) {
  if (n == null) return '—';
  const v = Number(n);
  if (v < 0.000001) return `$${v.toExponential(3)}`;
  if (v < 0.01)     return `$${v.toFixed(6)}`;
  return `$${v.toFixed(4)}`;
}

function pct(n) {
  if (n == null) return '—';
  const v = Number(n);
  const cl = v >= 0 ? 'text-ok' : 'text-warn';
  const sign = v >= 0 ? '+' : '';
  return `<span class="${cl}">${sign}${v.toFixed(2)}%</span>`;
}

// ── API helper ────────────────────────────────────────────────

async function get(path) {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${path}`);
  const j = await r.json();
  return j.data;
}

// ── Stats + Ticker ────────────────────────────────────────────

async function loadStats() {
  const [statsRes, marketRes, mnRes] = await Promise.allSettled([
    get('/stats'),
    get('/market'),
    get('/masternodes'),
  ]);

  const s  = statsRes.status  === 'fulfilled' ? statsRes.value  : null;
  const m  = marketRes.status === 'fulfilled' ? marketRes.value : null;
  const mn = mnRes.status     === 'fulfilled' ? mnRes.value     : null;

  const mnCount = mn
    ? (mn.total ?? mn.nodes?.length ?? mn.count ?? '—')
    : '—';

  const cards = [
    {
      label: 'Block Height',
      value: s ? fmt(s.blockHeight, 0) : '—',
      sub:   s ? `Avg time: ${s.avgBlockTime}s` : '',
    },
    {
      label: 'Circulating Supply',
      value: s ? fmtSupply(s.supply?.circulating) : '—',
      sub:   s?.supply?.max ? `Max: ${fmtSupply(s.supply.max)}` : 'No hard cap',
    },
    {
      label: 'Hashrate',
      value: s ? fmtHashrate(s.hashrate) : '—',
      sub:   s ? `Difficulty: ${fmt(s.difficulty, 2)}` : '',
    },
    {
      label: 'DFC Price',
      value: (m && m.available !== false) ? fmtPrice(m.priceUsd ?? m.price) : 'Unavailable',
      sub:   (m && m.available !== false && m.change24h != null) ? `24h: ${pct(m.change24h)} | Vol $${fmt(m.volumeUsd24h, 0)}` : 'No exchange source',
    },
    {
      label: 'Masternodes',
      value: fmt(mnCount, 0),
      sub:   '',
    },
    {
      label: 'Mempool',
      value: s ? `${fmt(s.mempool?.size, 0)} txs` : '—',
      sub:   s ? fmtBytes(s.mempool?.bytes) : '',
    },
    {
      label: 'Active Peers',
      value: s ? fmt(s.connections, 0) : '—',
      sub:   '',
    },
    {
      label: 'Block Reward',
      value: s ? `${fmt(s.blockReward, 0)} DFC` : '—',
      sub:   s ? `Staking: ${fmt(s.stakingReward, 0)} DFC` : '',
    },
  ];

  const grid = document.getElementById('statsGrid');
  grid.innerHTML = cards.map(c => `
    <div class="stat-card">
      <div class="stat-label">${c.label}</div>
      <div class="stat-value">${c.value}</div>
      ${c.sub ? `<div class="stat-sub">${c.sub}</div>` : ''}
    </div>
  `).join('');

  // Ticker
  if (s) {
    qs('#tickHeight').textContent  = `Height: ${fmt(s.blockHeight, 0)}`;
    qs('#tickHashrate').textContent= `Hashrate: ${fmtHashrate(s.hashrate)}`;
    qs('#tickMempool').textContent = `Mempool: ${s.mempool?.size ?? 0} txs`;
    qs('#tickPeers').textContent   = `Peers: ${s.connections}`;
    qs('#tickSupply').textContent  = `Supply: ${fmtSupply(s.supply?.circulating)}`;
  }
  if (m && m.available !== false) {
    qs('#tickPrice').textContent = `DFC: ${fmtPrice(m.priceUsd ?? m.price)} (${m.change24h >= 0 ? '+' : ''}${Number(m.change24h).toFixed(2)}%)`;
  } else {
    qs('#tickPrice').textContent = 'DFC: no market data';
  }
}

// ── Blocks table ──────────────────────────────────────────────

async function loadBlocks() {
  const blocks = await get('/blocks/latest?count=12');
  const tbody  = qs('#blocksBody');

  if (!Array.isArray(blocks) || blocks.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="tloading">No data</td></tr>';
    return;
  }

  tbody.innerHTML = blocks.map(b => {
    const id     = b.hash || b.height;
    const height = fmt(b.height, 0);
    const age    = fmtAge(b.time ?? b.timestamp ?? b.blockTime);
    const txs    = b.txCount ?? b.nTx ?? b.txcount ?? '—';
    const size   = fmtBytes(b.size);
    const reward = b.reward ? `${fmt(b.reward, 0)} DFC` : '—';
    return `
      <tr class="clickable" data-type="block" data-id="${id}">
        <td><span class="chip">${height}</span></td>
        <td class="text-muted">${age}</td>
        <td>${txs}</td>
        <td class="text-muted">${size}</td>
        <td class="mono small text-ok">${reward}</td>
      </tr>`;
  }).join('');

  qs('#blockBadge').textContent = 'Live';
  attachRowListeners();
}

// ── Transactions table ────────────────────────────────────────

async function loadTxs() {
  const txs   = await get('/txs/latest?count=12');
  const tbody = qs('#txsBody');

  if (!Array.isArray(txs) || txs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="tloading">No data</td></tr>';
    return;
  }

  tbody.innerHTML = txs.map(tx => {
    const txid  = tx.txid ?? tx.hash ?? '';
    const age   = fmtAge(tx.time ?? tx.timestamp ?? tx.blockTime);
    const ins   = tx.vin?.length ?? tx.inputs  ?? tx.vinCount  ?? '—';
    const outs  = tx.vout?.length ?? tx.outputs ?? tx.voutCount ?? '—';
    const amt   = tx.valueOut ?? tx.totalOut ?? tx.amount ?? tx.value ?? null;
    return `
      <tr class="clickable" data-type="tx" data-id="${txid}">
        <td class="mono small"><a href="#" onclick="return false">${fmtShort(txid, 16)}</a></td>
        <td class="text-muted">${age}</td>
        <td>${ins}</td>
        <td>${outs}</td>
        <td class="mono small text-ok">${amt != null ? fmt(amt, 4) : '—'} DFC</td>
      </tr>`;
  }).join('');

  attachRowListeners();
}

// ── Rich list ─────────────────────────────────────────────────

async function loadRichList() {
  const res  = await get('/richlist?page=1&limit=10');
  const list = Array.isArray(res) ? res : (res?.data ?? []);
  const tbody = qs('#richBody');

  if (!Array.isArray(list) || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="tloading">No data</td></tr>';
    return;
  }

  tbody.innerHTML = list.map((entry, i) => {
    const addr    = entry.address ?? '—';
    const balance = entry.balance ?? entry.amount ?? null;
    const rank    = entry.rank ?? (i + 1);
    return `
      <tr class="clickable" data-type="address" data-id="${addr}">
        <td class="text-muted">${rank}</td>
        <td class="mono small"><a href="#" onclick="return false">${fmtShort(addr, 20)}</a></td>
        <td class="mono small text-ok">${balance != null ? fmt(balance, 2) : '—'} DFC</td>
      </tr>`;
  }).join('');

  attachRowListeners();
}

// ── Market panel ──────────────────────────────────────────────

async function loadMarket() {
  const m = await get('/market');
  const g = qs('#marketGrid');
  if (!m || m.available === false) {
    g.innerHTML = `
      <div style="grid-column:1/-1;padding:24px;text-align:center;color:var(--muted)">
        <div style="font-size:1.8rem;margin-bottom:8px">📊</div>
        <div style="font-weight:600">Market data unavailable</div>
        <div style="font-size:0.78rem;margin-top:4px">No exchange data source configured</div>
      </div>`;
    return;
  }

  const items = [
    { label: 'Price (USD)', value: fmtPrice(m.priceUsd ?? m.price), sub: m.change24h != null ? `24h: ${pct(m.change24h)}` : '' },
    { label: 'Price (BTC)',  value: m.priceBtc ? `₿${Number(m.priceBtc).toFixed(8)}` : '—', sub: '' },
    { label: 'Market Cap',   value: m.marketCapUsd ? `$${fmt(m.marketCapUsd, 0)}` : '—', sub: '' },
    { label: 'Volume 24h',   value: m.volumeUsd24h ? `$${fmt(m.volumeUsd24h, 0)}` : '—', sub: '' },
    { label: 'ATH',          value: m.ath ? fmtPrice(m.ath) : '—', sub: m.athDate ? m.athDate.slice(0, 10) : '' },
    { label: 'Rank',         value: m.rank ? `#${m.rank}` : '—', sub: m.source ?? 'CoinGecko' },
  ];

  g.innerHTML = items.map(it => `
    <div class="market-item">
      <div class="mi-label">${it.label}</div>
      <div class="mi-value">${it.value}</div>
      ${it.sub ? `<div class="mi-sub">${it.sub}</div>` : ''}
    </div>
  `).join('');
}

// ── Row click → Modal ─────────────────────────────────────────

function attachRowListeners() {
  document.querySelectorAll('tr.clickable').forEach(row => {
    row.onclick = () => openDetail(row.dataset.type, row.dataset.id);
  });
}

async function openDetail(type, id) {
  const modal   = qs('#modal');
  const content = qs('#modalContent');
  content.innerHTML = '<div class="modal-loading">Loading…</div>';
  modal.classList.remove('hidden');

  try {
    let data, title;
    if (type === 'block')   { data = await get(`/block/${encodeURIComponent(id)}`);   title = `Block ${id}`; }
    else if (type === 'tx') { data = await get(`/tx/${encodeURIComponent(id)}`);      title = `Transaction`; }
    else                    { data = await get(`/address/${encodeURIComponent(id)}`); title = `Address`; }

    content.innerHTML = `
      <h3>${title}</h3>
      <pre class="detail-pre">${JSON.stringify(data, null, 2)}</pre>
    `;
  } catch (e) {
    content.innerHTML = `<p style="color:var(--bad);padding:8px">Failed to load: ${e.message}</p>`;
  }
}

// ── Search ────────────────────────────────────────────────────

async function doSearch(q) {
  if (!q.trim()) return;
  const section = qs('#searchResults');
  section.classList.remove('hidden');
  section.innerHTML = `<h2>Searching for <em>${q}</em>…</h2>`;
  section.scrollIntoView({ behavior: 'smooth' });

  try {
    const result = await get(`/search?q=${encodeURIComponent(q)}`);
    const type   = result?.type ?? 'result';
    const data   = result?.result ?? result?.data ?? result;
    section.innerHTML = `
      <h2>Search result &mdash; <span class="chip">${type}</span></h2>
      <pre class="detail-pre">${JSON.stringify(data, null, 2)}</pre>
    `;
  } catch (e) {
    section.innerHTML = `<h2>No results for <em>${q}</em></h2><p class="text-muted" style="margin-top:8px">${e.message}</p>`;
  }
}

// ── Helpers ───────────────────────────────────────────────────

function qs(sel) { return document.querySelector(sel); }

function setLastUpdate() {
  qs('#lastUpdate').textContent = new Date().toLocaleTimeString();
}

// ── Refresh cycle ─────────────────────────────────────────────

async function refresh() {
  await Promise.allSettled([
    loadStats(),
    loadBlocks(),
    loadTxs(),
    loadRichList(),
    loadMarket(),
  ]);
  setLastUpdate();
}

// ── Init ──────────────────────────────────────────────────────

qs('#searchForm').addEventListener('submit', e => {
  e.preventDefault();
  const val = qs('#searchInput').value.trim();
  if (val) doSearch(val);
});

qs('#modalClose').addEventListener('click', () => qs('#modal').classList.add('hidden'));
qs('#modalBackdrop').addEventListener('click', () => qs('#modal').classList.add('hidden'));

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') qs('#modal').classList.add('hidden');
});

refresh();
setInterval(refresh, REFRESH_MS);

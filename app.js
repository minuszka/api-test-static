const ENDPOINTS = [
  { method: 'GET', group: 'Stats',       path: '/stats' },
  { method: 'GET', group: 'Dashboard',   path: '/dashboard/overview' },
  { method: 'GET', group: 'Coin',        path: '/coin' },
  { method: 'GET', group: 'Sync',        path: '/sync' },
  { method: 'GET', group: 'Network',     path: '/network' },
  { method: 'GET', group: 'Blocks',      path: '/blocks/latest', query: { count: '5' } },
  { method: 'GET', group: 'Blocks',      path: '/blocks', query: { page: '1', limit: '10' } },
  { method: 'GET', group: 'Block',       path: '/block/:blockHash' },
  { method: 'GET', group: 'Txs',         path: '/txs/latest', query: { count: '5' } },
  { method: 'GET', group: 'Txs',         path: '/txs', query: { page: '1', limit: '10' } },
  { method: 'GET', group: 'Tx',          path: '/tx/:txid' },
  { method: 'GET', group: 'Mempool',     path: '/mempool', query: { limit: '10' } },
  { method: 'GET', group: 'Masternodes', path: '/masternodes' },
  { method: 'GET', group: 'Rich List',   path: '/richlist', query: { page: '1', limit: '10' } },
  { method: 'GET', group: 'Rich List',   path: '/richlist/distribution' },
  { method: 'GET', group: 'Address',     path: '/address/:address' },
  { method: 'GET', group: 'Address',     path: '/address/:address/txs', query: { page: '1', limit: '5' } },
  { method: 'GET', group: 'Market',      path: '/market' },
  { method: 'GET', group: 'Market',      path: '/market/history', query: { days: '30' } },
  { method: 'GET', group: 'Search',      path: '/search', query: { q: 'defcon' } },
];

const dom = {
  baseUrl: document.getElementById('baseUrl'),
  addressInput: document.getElementById('addressInput'),
  blockHashInput: document.getElementById('blockHashInput'),
  txidInput: document.getElementById('txidInput'),
  runButton: document.getElementById('runButton'),
  runStatus: document.getElementById('runStatus'),
  currentEndpoint: document.getElementById('currentEndpoint'),
  summary: document.getElementById('summary'),
  resultsList: document.getElementById('resultsList'),
};

function getDefaultBaseUrl() {
  return 'https://deftrack.xyz/api';
}

function normalizeBaseUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return getDefaultBaseUrl();

  if (raw.startsWith('/')) {
    if (window.location.protocol === 'file:') {
      return `http://localhost:3001${raw}`.replace(/\/+$/, '');
    }
    return raw.replace(/\/+$/, '');
  }

  return raw.replace(/\/+$/, '');
}

function createResultCard(index, endpoint) {
  const card = document.createElement('article');
  card.className = 'result-card';
  card.innerHTML = `
    <div class="result-head">
      <span class="endpoint-number">#${index + 1}</span>
      <span class="endpoint-path">${endpoint.method} ${endpoint.path}</span>
      <span class="badge pending">Varakozik</span>
    </div>
    <div class="result-meta">Csoport: ${endpoint.group}</div>
    <div class="response-box"><pre>Meg nincs lefuttatva.</pre></div>
  `;
  return card;
}

function setCardState(card, statusClass, label) {
  const badge = card.querySelector('.badge');
  badge.className = `badge ${statusClass}`;
  badge.textContent = label;
}

function updateCardResponse(card, metaText, payloadText) {
  const meta = card.querySelector('.result-meta');
  const pre = card.querySelector('pre');
  meta.textContent = metaText;
  pre.textContent = payloadText;
}

function toQueryString(query) {
  if (!query) return '';
  const params = new URLSearchParams(query);
  const str = params.toString();
  return str ? `?${str}` : '';
}

function jsonOrText(text) {
  if (!text) return '';
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function readJsonSafe(response) {
  const text = await response.text();
  return jsonOrText(text);
}

function looksLikeStatic404(status, body) {
  if (status !== 404 || typeof body !== 'string') return false;
  const lower = body.toLowerCase();
  return lower.includes('file not found') && lower.includes('<!doctype html>');
}

async function probeBase(baseV1) {
  try {
    const response = await fetch(`${baseV1}/stats`);
    const body = await readJsonSafe(response);
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    return { ok: false, status: 0, body: error && error.message ? error.message : String(error) };
  }
}

function describeProbeFailure(probe, baseV1) {
  if (!probe) {
    return `Nem sikerult elerni a base URL-t: ${baseV1}`;
  }

  if (probe.status === 0) {
    return `Nem erheto el az API (${baseV1}). Ellenorizd az URL-t vagy a CORS bedallitasokat.`;
  }

  if (looksLikeStatic404(probe.status, probe.body)) {
    return `A megadott URL nem az API-ra mutat (${baseV1}), hanem statikus fajlszerverre.`;
  }

  return `A /stats probe hibas valaszt adott (HTTP ${probe.status}) ezen: ${baseV1}`;
}

async function chooseBaseUrl(baseV1) {
  const normalized = normalizeBaseUrl(baseV1);
  const candidates = [normalized];
  const localhostFallback = 'http://localhost:3001/api';
  let lastProbe = null;

  if (normalized.startsWith('/') && !candidates.includes(localhostFallback)) {
    candidates.push(localhostFallback);
  }

  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    const probe = await probeBase(candidate);
    lastProbe = { ...probe, candidate };
    if (probe.ok) {
      return {
        baseV1: candidate,
        switched: candidate !== normalized,
        probeOk: true,
        reason: candidate !== normalized ? 'Relative URL helyett localhost API lett hasznalva.' : '',
      };
    }

    if (i === 0 && normalized.startsWith('/') && looksLikeStatic404(probe.status, probe.body)) {
      // Try next fallback.
      continue;
    }

    if (i === candidates.length - 1) {
      return {
        baseV1: candidate,
        switched: false,
        probeOk: false,
        reason: describeProbeFailure(lastProbe, candidate),
      };
    }
  }

  return {
    baseV1: normalized,
    switched: false,
    probeOk: false,
    reason: describeProbeFailure(lastProbe, normalized),
  };
}

function buildApiRoot(baseV1) {
  // baseV1 is already the api root (e.g. https://deftrack.xyz/api)
  return baseV1;
}

async function resolveAddress(baseApi) {
  const url = `${baseApi}/richlist?page=1&limit=1`;
  const response = await fetch(url);
  const body = await readJsonSafe(response);
  if (!response.ok) return null;
  if (!body || typeof body !== 'object') return null;
  if (!Array.isArray(body.data) || body.data.length === 0) return null;
  return body.data[0] && typeof body.data[0].address === 'string' ? body.data[0].address : null;
}

async function resolveBlockHash(baseApi) {
  const url = `${baseApi}/blocks/latest?count=1`;
  const response = await fetch(url);
  const body = await readJsonSafe(response);
  if (!response.ok) return null;
  if (!body || typeof body !== 'object') return null;
  if (!Array.isArray(body.data) || body.data.length === 0) return null;
  const b = body.data[0];
  if (b && typeof b.hash === 'string') return b.hash;
  if (b && typeof b.height === 'number') return String(b.height);
  return null;
}

async function resolveTxid(baseApi) {
  const url = `${baseApi}/txs/latest?count=1`;
  const response = await fetch(url);
  const body = await readJsonSafe(response);
  if (!response.ok) return null;
  if (!body || typeof body !== 'object') return null;
  if (!Array.isArray(body.data) || body.data.length === 0) return null;
  const tx = body.data[0];
  return tx && typeof tx.txid === 'string' ? tx.txid : null;
}

function replaceParams(path, params) {
  return path
    .replace(':address', encodeURIComponent(params.address || ''))
    .replace(':blockHash', encodeURIComponent(params.blockHash || ''))
    .replace(':txid', encodeURIComponent(params.txid || ''));
}

function missingParamKey(path, params) {
  if (path.includes(':address') && !params.address) return 'address';
  if (path.includes(':blockHash') && !params.blockHash) return 'blockHash';
  if (path.includes(':txid') && !params.txid) return 'txid';
  return null;
}

function prettyPrint(data) {
  if (typeof data === 'string') return data;
  return JSON.stringify(data, null, 2);
}

async function fetchOne(baseV1, endpoint, params) {
  const path = replaceParams(endpoint.path, params);
  const url = `${baseV1}${path}${toQueryString(endpoint.query)}`;
  const startedAt = performance.now();
  const response = await fetch(url);
  const body = await readJsonSafe(response);
  const elapsedMs = Math.round(performance.now() - startedAt);
  return {
    url,
    elapsedMs,
    status: response.status,
    ok: response.ok,
    body,
  };
}

async function runAll() {
  dom.runButton.disabled = true;
  dom.runStatus.textContent = 'Kapcsolat ellenorzese...';
  dom.currentEndpoint.textContent = '-';
  dom.summary.textContent = `0 / 0 / 0`;

  const resolvedBase = await chooseBaseUrl(dom.baseUrl.value);
  const baseV1 = resolvedBase.baseV1;
  dom.baseUrl.value = baseV1;
  dom.runStatus.textContent = resolvedBase.probeOk
    ? (resolvedBase.reason ? `API hivasok futnak... ${resolvedBase.reason}` : 'API hivasok futnak...')
    : `Inditasi hiba: ${resolvedBase.reason}`;
  dom.resultsList.innerHTML = '';

  const cards = ENDPOINTS.map((endpoint, index) => {
    const card = createResultCard(index, endpoint);
    dom.resultsList.appendChild(card);
    return card;
  });

  if (!resolvedBase.probeOk) {
    for (let i = 0; i < cards.length; i += 1) {
      setCardState(cards[i], 'pending', 'Kihagyva');
      updateCardResponse(
        cards[i],
        `Kihagyva | API nem erheto el`,
        `${resolvedBase.reason}\n\nTipp: ellenorizd az API URL-t a fenti mezoben.`
      );
    }
    dom.currentEndpoint.textContent = '-';
    dom.summary.textContent = `0 / 0 / ${cards.length}`;
    dom.runButton.disabled = false;
    return;
  }

  const params = {
    address: dom.addressInput.value.trim(),
    blockHash: dom.blockHashInput.value.trim(),
    txid: dom.txidInput.value.trim(),
  };

  if (!params.address) {
    try {
      const autoAddress = await resolveAddress(baseV1);
      if (autoAddress) {
        params.address = autoAddress;
        dom.addressInput.value = autoAddress;
      }
    } catch {
      // Keep manual fallback.
    }
  }

  if (!params.blockHash) {
    try {
      const autoHash = await resolveBlockHash(baseV1);
      if (autoHash) {
        params.blockHash = autoHash;
        dom.blockHashInput.value = autoHash;
      }
    } catch {
      // Keep manual fallback.
    }
  }

  if (!params.txid) {
    try {
      const autoTxid = await resolveTxid(baseV1);
      if (autoTxid) {
        params.txid = autoTxid;
        dom.txidInput.value = autoTxid;
      }
    } catch {
      // Keep manual fallback.
    }
  }

  let okCount = 0;
  let badCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < ENDPOINTS.length; i += 1) {
    const endpoint = ENDPOINTS[i];
    const card = cards[i];
    dom.currentEndpoint.textContent = `API #${i + 1}: ${endpoint.method} ${endpoint.path}`;
    setCardState(card, 'running', 'Fut');

    const missing = missingParamKey(endpoint.path, params);
    if (missing) {
      skippedCount += 1;
      setCardState(card, 'pending', 'Kihagyva');
      updateCardResponse(
        card,
        `Kihagyva | hianyzik a kotelezo parameter: ${missing}`,
        `Add meg kezzel a(z) ${missing} erteket fent, majd futtasd ujra.`
      );
      dom.summary.textContent = `${okCount} / ${badCount} / ${skippedCount}`;
      continue;
    }

    try {
      const result = await fetchOne(baseV1, endpoint, params);
      const statusText = `${result.ok ? 'Sikeres' : 'Hibas'} valasz | HTTP ${result.status} | ${result.elapsedMs} ms | ${result.url}`;
      updateCardResponse(card, statusText, prettyPrint(result.body));

      if (result.ok) {
        okCount += 1;
        setCardState(card, 'ok', 'OK');
      } else {
        badCount += 1;
        setCardState(card, 'bad', 'Hiba');
      }
    } catch (error) {
      badCount += 1;
      const message = error && error.message ? error.message : String(error);
      updateCardResponse(
        card,
        `Hibas valasz | kapcsolat/fetch hiba`,
        message
      );
      setCardState(card, 'bad', 'Hiba');
    }

    dom.summary.textContent = `${okCount} / ${badCount} / ${skippedCount}`;
  }

  dom.runStatus.textContent = 'Kesz. Minden API endpoint feldolgozva.';
  dom.currentEndpoint.textContent = '-';
  dom.runButton.disabled = false;
}

function init() {
  dom.baseUrl.value = getDefaultBaseUrl();
  dom.runButton.addEventListener('click', runAll);
  runAll().catch(() => {
    dom.runStatus.textContent = 'Hiba tortent futas kozben.';
    dom.currentEndpoint.textContent = '-';
    dom.runButton.disabled = false;
  });
}

init();

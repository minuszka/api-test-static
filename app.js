const ENDPOINTS = [
  { id: 'meta', label: 'V1 Meta', path: '/api/v1/meta', method: 'GET' },
  { id: 'networkHealth', label: 'V1 Network Health', path: '/api/v1/network/health', method: 'GET' },
  { id: 'rewardsCurrent', label: 'V1 Rewards Current', path: '/api/v1/rewards/current', method: 'GET' },
  { id: 'latestBlocksV1', label: 'V1 Latest Blocks', path: '/api/v1/blocks/latest?count=10', method: 'GET' },
  { id: 'latestTxsV1', label: 'V1 Latest Txs', path: '/api/v1/txs/latest?count=10', method: 'GET' },
  {
    id: 'addressRewards',
    label: 'V1 Address Rewards',
    path: '/api/v1/address/{address}/rewards?days=30',
    method: 'GET',
    requiresAddress: true,
  },
  {
    id: 'masternodeById',
    label: 'V1 Masternode By ID',
    path: '/api/v1/masternodes/{mnId}',
    method: 'GET',
    requiresMasternodeId: true,
  },
  {
    id: 'masternodeEvents',
    label: 'V1 Masternode Events',
    path: '/api/v1/masternodes/{mnId}/events?limit=20',
    method: 'GET',
    requiresMasternodeId: true,
  },
  { id: 'stats', label: 'Core Stats', path: '/api/stats', method: 'GET' },
  { id: 'masternodes', label: 'Core Masternodes', path: '/api/masternodes', method: 'GET' },
  { id: 'market', label: 'Core Market', path: '/api/market', method: 'GET' },
  {
    id: 'migration',
    label: 'Migration Transparency',
    path: '/api/migration/transparency?count=20',
    method: 'GET',
  },
];

const endpointBody = document.getElementById('endpointBody');
const responseMeta = document.getElementById('responseMeta');
const responseViewer = document.getElementById('responseViewer');
const baseUrlInput = document.getElementById('baseUrlInput');
const addressInput = document.getElementById('addressInput');
const mnIdInput = document.getElementById('mnIdInput');
const runAllBtn = document.getElementById('runAllBtn');
const clearBtn = document.getElementById('clearBtn');
const copyCurlBtn = document.getElementById('copyCurlBtn');
const copyJsonBtn = document.getElementById('copyJsonBtn');

let activeEndpointId = null;
let lastCurl = '';
let lastJson = '';
let autoDiscoverAttempted = false;

function formatMs(value) {
  if (!Number.isFinite(value)) return 'n/a';
  return `${Math.round(value)} ms`;
}

function setStatus(el, type, text) {
  el.className = `status-pill status-${type}`;
  el.textContent = text;
}

function normalizeBaseUrl(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return 'https://deftrack.xyz';
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function resolvePath(template) {
  let path = template;
  if (path.includes('{address}')) {
    const address = (addressInput.value || '').trim();
    path = path.replace('{address}', encodeURIComponent(address));
  }
  if (path.includes('{mnId}')) {
    const mnId = (mnIdInput.value || '').trim();
    path = path.replace('{mnId}', encodeURIComponent(mnId));
  }
  return path;
}

function endpointCanRun(endpoint) {
  if (endpoint.requiresAddress && !(addressInput.value || '').trim()) return false;
  if (endpoint.requiresMasternodeId && !(mnIdInput.value || '').trim()) return false;
  return true;
}

function pickFirstAddressFromTxs(payload) {
  const txs = Array.isArray(payload?.data) ? payload.data : [];
  for (const tx of txs) {
    const outputs = Array.isArray(tx?.vout) ? tx.vout : [];
    for (const out of outputs) {
      const addresses = Array.isArray(out?.scriptPubKey?.addresses) ? out.scriptPubKey.addresses : [];
      const found = addresses.find((addr) => typeof addr === 'string' && addr.length >= 26);
      if (found) return found;
    }
  }
  return '';
}

function pickFirstMasternodeId(payload) {
  const nodes = Array.isArray(payload?.data?.nodes) ? payload.data.nodes : [];
  const first = nodes[0];
  if (!first) return '';
  if (typeof first.id === 'string' && first.id.trim()) return first.id.trim();
  if (typeof first.proTxHash === 'string' && first.proTxHash.trim()) return first.proTxHash.trim();
  return '';
}

async function autoDiscoverInputs() {
  if (autoDiscoverAttempted) return;
  autoDiscoverAttempted = true;

  const needAddress = !(addressInput.value || '').trim();
  const needMnId = !(mnIdInput.value || '').trim();
  if (!needAddress && !needMnId) return;

  const baseUrl = normalizeBaseUrl(baseUrlInput.value);
  responseMeta.textContent = 'Auto-discovering address and masternode ID...';

  const tasks = [];

  if (needAddress) {
    tasks.push(
      fetch(`${baseUrl}/api/txs/latest?count=25`, { headers: { Accept: 'application/json' } })
        .then((r) => r.json())
        .then((body) => ({ kind: 'address', value: pickFirstAddressFromTxs(body) }))
        .catch(() => ({ kind: 'address', value: '' }))
    );
  }

  if (needMnId) {
    tasks.push(
      fetch(`${baseUrl}/api/masternodes`, { headers: { Accept: 'application/json' } })
        .then((r) => r.json())
        .then((body) => ({ kind: 'mnId', value: pickFirstMasternodeId(body) }))
        .catch(() => ({ kind: 'mnId', value: '' }))
    );
  }

  const results = await Promise.all(tasks);
  for (const result of results) {
    if (result.kind === 'address' && result.value && !(addressInput.value || '').trim()) {
      addressInput.value = result.value;
    }
    if (result.kind === 'mnId' && result.value && !(mnIdInput.value || '').trim()) {
      mnIdInput.value = result.value;
    }
  }

  renderTable();
}

function renderTable() {
  endpointBody.innerHTML = '';

  for (const endpoint of ENDPOINTS) {
    const tr = document.createElement('tr');
    tr.className = 'endpoint-row';
    tr.dataset.endpointId = endpoint.id;

    const canRun = endpointCanRun(endpoint);
    const resolvedPath = resolvePath(endpoint.path);

    tr.innerHTML = `
      <td>
        <div>${endpoint.label}</div>
        <div class="path mono">${resolvedPath}</div>
      </td>
      <td><span class="status-pill status-idle">${canRun ? 'Ready' : 'Input needed'}</span></td>
      <td class="mono">-</td>
      <td><button type="button" class="ghost-btn run-one-btn" ${canRun ? '' : 'disabled'}>Run</button></td>
    `;

    tr.addEventListener('click', (e) => {
      if (e.target instanceof HTMLElement && e.target.classList.contains('run-one-btn')) return;
      setActiveEndpoint(endpoint.id);
    });

    const runBtn = tr.querySelector('.run-one-btn');
    runBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      setActiveEndpoint(endpoint.id);
      await runOne(endpoint.id);
    });

    endpointBody.appendChild(tr);
  }
}

function setActiveEndpoint(endpointId) {
  activeEndpointId = endpointId;
  const rows = endpointBody.querySelectorAll('.endpoint-row');
  for (const row of rows) {
    row.classList.toggle('active', row.dataset.endpointId === endpointId);
  }
}

async function runOne(endpointId) {
  const endpoint = ENDPOINTS.find((entry) => entry.id === endpointId);
  if (!endpoint) return;

  const row = endpointBody.querySelector(`tr[data-endpoint-id="${endpointId}"]`);
  if (!row) return;

  const statusEl = row.querySelector('.status-pill');
  const latencyEl = row.children[2];

  if (!endpointCanRun(endpoint)) {
    setStatus(statusEl, 'warn', 'Input needed');
    latencyEl.textContent = 'n/a';
    return;
  }

  setStatus(statusEl, 'warn', 'Running');
  latencyEl.textContent = '...';

  const baseUrl = normalizeBaseUrl(baseUrlInput.value);
  const path = resolvePath(endpoint.path);
  const url = `${baseUrl}${path}`;
  const curl = `curl -sS "${url}"`;

  const started = performance.now();

  try {
    const response = await fetch(url, {
      method: endpoint.method,
      headers: {
        Accept: 'application/json',
      },
    });

    const latency = performance.now() - started;
    let body;

    try {
      body = await response.json();
    } catch {
      body = { parseError: 'Response is not valid JSON.' };
    }

    if (response.ok) {
      setStatus(statusEl, 'ok', `${response.status}`);
    } else {
      setStatus(statusEl, 'err', `${response.status}`);
    }

    latencyEl.textContent = formatMs(latency);

    if (activeEndpointId === endpointId) {
      responseMeta.textContent = `${endpoint.label} | ${response.status} | ${formatMs(latency)}`;
      responseViewer.textContent = JSON.stringify(body, null, 2);
      lastJson = responseViewer.textContent;
      lastCurl = curl;
      copyCurlBtn.disabled = false;
      copyJsonBtn.disabled = false;
    }
  } catch (error) {
    const latency = performance.now() - started;
    setStatus(statusEl, 'err', 'Failed');
    latencyEl.textContent = formatMs(latency);

    if (activeEndpointId === endpointId) {
      const errorBody = {
        error: 'Network request failed',
        detail: error instanceof Error ? error.message : String(error),
      };
      responseMeta.textContent = `${endpoint.label} | network error`;
      responseViewer.textContent = JSON.stringify(errorBody, null, 2);
      lastJson = responseViewer.textContent;
      lastCurl = curl;
      copyCurlBtn.disabled = false;
      copyJsonBtn.disabled = false;
    }
  }
}

async function runAll() {
  await autoDiscoverInputs();
  for (const endpoint of ENDPOINTS) {
    await runOne(endpoint.id);
  }
}

function clearResults() {
  activeEndpointId = null;
  lastCurl = '';
  lastJson = '';
  autoDiscoverAttempted = false;
  responseMeta.textContent = 'No endpoint selected yet.';
  responseViewer.textContent = 'Select an endpoint row to inspect output.';
  copyCurlBtn.disabled = true;
  copyJsonBtn.disabled = true;
  renderTable();
}

async function copyText(text, button, fallbackLabel) {
  if (!text) return;
  const original = button.textContent;
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = 'Copied';
    setTimeout(() => {
      button.textContent = original || fallbackLabel;
    }, 1500);
  } catch {
    button.textContent = 'Copy failed';
    setTimeout(() => {
      button.textContent = original || fallbackLabel;
    }, 1500);
  }
}

runAllBtn.addEventListener('click', runAll);
clearBtn.addEventListener('click', clearResults);

copyCurlBtn.addEventListener('click', () => copyText(lastCurl, copyCurlBtn, 'Copy cURL'));
copyJsonBtn.addEventListener('click', () => copyText(lastJson, copyJsonBtn, 'Copy JSON'));

addressInput.addEventListener('input', () => {
  autoDiscoverAttempted = false;
  renderTable();
});
mnIdInput.addEventListener('input', () => {
  autoDiscoverAttempted = false;
  renderTable();
});
baseUrlInput.addEventListener('input', () => {
  autoDiscoverAttempted = false;
});

renderTable();

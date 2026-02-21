# DeFCoN Explorer — API Tester

A lightweight, framework-free static page that sequentially calls every endpoint of the [DeFCoN Explorer API](https://deftrack.xyz/api) and displays the full JSON responses. Includes a live Explorer Demo page with auto-refreshing stats, blocks, transactions, rich list, and market data.

**Live:** [api-test-static.onrender.com](https://api-test-static.onrender.com)

---

## Pages

| Page | Description |
|------|-------------|
| `index.html` | API Tester — runs all 20 endpoints and shows raw JSON responses |
| `explorer.html` | Explorer Demo — visual block explorer UI with live data |

---

## API Tester

Opens automatically on load. For each endpoint it shows the HTTP status, response time, full URL, and the JSON body.

- Wallet address, block hash, and transaction ID are **auto-resolved** from live data
- All three can be overridden manually in the input fields
- Click **Re-run all endpoints** to re-execute

### Base URL options

| Environment | Base URL |
|-------------|----------|
| Production | `https://deftrack.xyz/api` |
| Local dev | `http://localhost:3001/api` |
| Relative | `/api` |

---

## Endpoints covered (20)

| Group | Endpoint |
|-------|----------|
| Stats | `GET /stats` |
| Dashboard | `GET /dashboard/overview` |
| Coin | `GET /coin` |
| Sync | `GET /sync` |
| Network | `GET /network` |
| Blocks | `GET /blocks/latest` |
| Blocks | `GET /blocks` |
| Block | `GET /block/:blockHash` |
| Transactions | `GET /txs/latest` |
| Transactions | `GET /txs` |
| Transaction | `GET /tx/:txid` |
| Mempool | `GET /mempool` |
| Masternodes | `GET /masternodes` |
| Rich List | `GET /richlist` |
| Rich List | `GET /richlist/distribution` |
| Address | `GET /address/:address` |
| Address | `GET /address/:address/txs` |
| Market | `GET /market` |
| Market | `GET /market/history` |
| Search | `GET /search` |

---

## Local development

No build step required. Open `index.html` directly in a browser, or serve the directory with any static file server:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

---

## Deployment (Render)

Configured for [Render Static Sites](https://render.com) via `render.yaml`.

- **Publish directory:** `.` (repo root)
- **Build command:** *(none)*
- Security headers (CSP, X-Frame-Options, etc.) are set in `render.yaml`

---

## Stack

Pure HTML + CSS + Vanilla JS. No dependencies, no build tools, no frameworks.

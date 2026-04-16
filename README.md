# DefTrack API Tester (Static)

Framework-free static UI for testing DefTrack API endpoints and browsing live chain data.

Live site: [https://apitest.deftrack.xyz](https://apitest.deftrack.xyz)

## Project Structure

- `index.html` + `app.js`: endpoint matrix tester
- `explorer.html` + `explorer.js`: live dashboard / explorer view
- `styles.css`, `explorer.css`: page styles

## API Tester (`index.html`)

Features:

- Runs endpoint checks from one table (`Run All Checks` or per-row `Run`)
- Shows status code and latency
- Shows JSON response body and cURL for selected row
- Auto-discovers sample `address` and `masternode id` for parameterized endpoints
- Validates response type (non-JSON `200` is treated as error)

Default Base URL:

- `https://deftrack.xyz`

Discovery fallback bases:

- `https://deftrack.xyz`
- `https://apitest.deftrack.xyz`

### Covered Endpoints (12)

- `GET /api/v1/meta`
- `GET /api/v1/network/health`
- `GET /api/v1/rewards/current`
- `GET /api/v1/blocks/latest?count=10`
- `GET /api/v1/txs/latest?count=10`
- `GET /api/v1/address/{address}/rewards?days=30`
- `GET /api/v1/masternodes/{mnId}`
- `GET /api/v1/masternodes/{mnId}/events?limit=20`
- `GET /api/stats`
- `GET /api/masternodes`
- `GET /api/market`
- `GET /api/migration/transparency?count=20`

## Explorer (`explorer.html`)

Features:

- Auto-refresh every 30s
- Stats cards, latest blocks, latest transactions, rich list, market panel
- Search and detail modal
- Multi-backend API fallback with timeout for resiliency:
  - `https://deftrack.xyz/api`
  - `${window.location.origin}/api`
  - `https://apitest.deftrack.xyz/api`

## Local Development

No build tools required.

```bash
npx serve .
# or
python3 -m http.server 8080
```

Open:

- `http://localhost:8080/index.html`
- `http://localhost:8080/explorer.html`

## Deployment

Static files can be served by Nginx (current production setup) or any static host.

Important production notes:

- If browser calls go directly to `deftrack.xyz`, CORS headers must be present there.
- If `/api` is proxied via `apitest.deftrack.xyz`, ensure Nginx `location /api/` routes to upstream API and does not fall through to `index.html`.

## Stack

- Pure HTML/CSS/vanilla JS
- No build step
- No external frontend dependencies

# DeFCoN Explorer – API teszt statikus oldal

Ez a mappan belul egy egyszeru, framework-mentes statikus oldal talalahato,
amely sorban lefuttatja a DeFCoN Explorer osszes API endpointjat es megjeleníti
a valaszokat.

## Hasznalat

1. Nyisd meg az `index.html` fajlt egy bongeszoben (vagy szerveld ki statikusan).
2. A lap automatikusan a `https://deftrack.xyz/api` URL-t hasznalja.
3. Az address, block hash es txid parametereket a lap automatikusan felderiti.
4. Kattints az **"API-k ujraolvasasa"** gombra a manualis futatatashoz.

## Base URL lehetosegek

| Kornyezet          | Base URL                          |
|--------------------|-----------------------------------|
| Eles (Render)      | `https://deftrack.xyz/api`        |
| Lokalis fejlesztes | `http://localhost:3001/api`       |
| Relativ (deploy)   | `/api`                            |

## API endpointok (20 db)

- `GET /stats`
- `GET /dashboard/overview`
- `GET /coin`
- `GET /sync`
- `GET /network`
- `GET /blocks/latest`
- `GET /blocks`
- `GET /block/:blockHash`
- `GET /txs/latest`
- `GET /txs`
- `GET /tx/:txid`
- `GET /mempool`
- `GET /masternodes`
- `GET /richlist`
- `GET /richlist/distribution`
- `GET /address/:address`
- `GET /address/:address/txs`
- `GET /market`
- `GET /market/history`
- `GET /search`

## Render deploy

Ez a mappa keszre van a Render Static Site deploy-hoz:
- **Publish directory:** `api-test-static`
- **Build command:** *(ures, nincs build)*

## What you should see

- API calls are numbered `#1 .. #8`
- the page shows which endpoint is running now
- summary format: `success / error / skipped`

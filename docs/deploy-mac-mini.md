# Mac Mini handoff

Run this on the Mac Mini. The Windows PC is not the host. Docker, Postgres, the API, and the console all run on the Mini.

The clinic in this repo is fictional Demo Family Clinic. Do not put a real patient's file in it.

## What you are starting

| Process | Where | Port |
|---|---|---|
| Postgres, Redis, Kafka, LiveKit, Prometheus, Grafana | `deploy/docker-compose.yml` | 5432, 6379, 9092, 7880, 9090, 3001 |
| Clinic API | `api/` on the host | 8000 |
| Staff console and demo phone | `console/server.js` | 8001 |

The API process keeps live call state in memory. `REDIS_URL` and `KAFKA_BOOTSTRAP_SERVERS` are in `.env.example` for the compose stack. This API build does not open those connections. Traces are still written to Postgres and to `data/traces/`. One API process is the whole demo. Do not run two copies against the same database.

Grafana at http://127.0.0.1:3001 (`admin` / `admin`) will not show the API until Prometheus can reach it. The compose file scrapes a container named `api`, and the API is on the host. For a first demo, ignore Grafana.

## 1. Install

- Docker Desktop, and leave it running
- Python 3.12
- Node 20 or newer
- `cloudflared` (`brew install cloudflared`)
- Git

```bash
git clone https://github.com/Anupamgt/bolnai-helpdesk-.git
cd bolnai-helpdesk-
```

## 2. Secrets

Copy the example and fill it on the Mini. Do not copy a committed `.env`. There isn't one. Bring `BOLNA_API_KEY` from the password store or from the Windows machine by hand.

```bash
cp deploy/.env.example .env
```

Set at least:

```bash
BOLNA_API_KEY=...
BOLNA_AGENT_ID=...
DATABASE_URL=postgresql://clinic:clinic@127.0.0.1:5432/clinic
PUBLIC_BASE_URL=https://YOUR-TUNNEL.trycloudflare.com
```

Leave `DESK_PIN=2468` unless you change it everywhere. Generate new values for `BOLNA_TOOL_TOKEN`, `BOLNA_WEBHOOK_TOKEN`, and `INTERNAL_TOKEN` before any tunnel is public, and put the same tool and webhook tokens into the Bolna agent.

`LIVEKIT_API_KEY=devkey` and `LIVEKIT_API_SECRET=secret` match LiveKit's dev mode in compose. Do not expose port 7880 to the internet.

## 3. Database and media

```bash
docker compose -f deploy/docker-compose.yml up -d
docker compose -f deploy/docker-compose.yml ps
```

Postgres loads `db/schema.sql`, `db/seed.sql`, `db/002_runtime.sql`, `db/seed_runtime.sql`, and `db/003_desk.sql` only when the volume is empty. `003_desk.sql` adds the demo staff PINs.

Check:

```bash
docker compose -f deploy/docker-compose.yml exec postgres \
  psql -U clinic -d clinic -c "SELECT key, phone FROM caller_personas;"
```

You should see `meera`, `kabir`, `family`, and `unknown`.

Reset a bad volume with `docker compose -f deploy/docker-compose.yml down -v`. That deletes the demo database.

## 4. API

macOS does not need the Windows selector-loop flag.

```bash
cd api
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

`GET http://127.0.0.1:8000/healthz` returns `{"ok": true}`.

Optional check, from `api/` with the venv active. It starts its own throwaway database and does not touch Docker:

```bash
# only if you also want the in-process test database
# node ../scripts/pglite/server.mjs
pytest tests
```

Skip pytest on the Mini if Node's PGlite port 54329 would confuse you. The demo uses Docker Postgres.

## 5. Console

In another terminal, from the repo root:

```bash
node console/server.js
```

- Desk, live data: http://127.0.0.1:8001/?live=1
- Sample day, no API: http://127.0.0.1:8001/
- Caller buttons: http://127.0.0.1:8001/phone.html

The console proxies `/api` to `http://127.0.0.1:8000`. Override with `BOLNAI_API` if the API is elsewhere.

Pins on the switch-user sheet: reception `2468`, Dr Sharma `2222`, Dr Kaur `3333`, Dr Verma `4444`, admin `1357`. Admin approves refunds. A doctor's pin decides a refill.

## 6. Bolna

In the Bolna builder, one agent, English / Hindi / Hinglish. Paste the prompt and the custom functions from `docs/prd/TECHNICAL_PRD.md` section 6. Enable web call. Put the agent id in `BOLNA_AGENT_ID` and restart uvicorn.

Bolna must reach the Mini:

```bash
cloudflared tunnel --url http://127.0.0.1:8000
```

Put the `https://….trycloudflare.com` origin in `PUBLIC_BASE_URL`, in every custom-function URL, and in the webhook:

- Tools: `$PUBLIC_BASE_URL/v1/tools/<name>`
- Webhook: `$PUBLIC_BASE_URL/v1/bolna/webhook`
- Header on the webhook: `Authorization: Bearer $BOLNA_WEBHOOK_TOKEN`

Restart uvicorn after `.env` changes. When cloudflared restarts, the hostname changes. Update Bolna and `PUBLIC_BASE_URL` together.

`phone.html` mints a session. Microphone audio starts after the Bolna web-call SDK is added to that page from Bolna's web-call docs. Until then, the desk still shows the call once the session exists.

## 7. First check on the Mini

1. Open the live desk. Sign-in on that page uses pin `2468` against the API.
2. Open the phone page and start Meera.
3. Ask for hours, then the blood test, then the last visit. Hours need no verification. The blood test needs Meera Demo and card `HC/2026/0412`.
4. Book Dr Kaur only after a clear yes to 200 rupees. The desk shows a queued UPI row. No money moves.
5. Ask for a person. Accept the handoff on the desk.

Staff audio in the same room needs the browser to join LiveKit at `ws://127.0.0.1:7880` with the token the accept call returns. The local wav is still written under `data/recordings/`.

## Demo PINs and people

All of these are fictional.

| Who | Pin or id |
|---|---|
| Reception | 2468 |
| Dr Sharma | 2222 |
| Dr Kaur | 3333 |
| Dr Verma | 4444 |
| Admin | 1357 |
| Meera Demo | card `HC/2026/0412`, phone `+919822222222` |
| Family phone | `+919811111111`, Asha `482 915 6`, Rohan `736 204 9` |

## If it fails

- `healthz` fails: Docker Postgres is not on 5432, or `DATABASE_URL` still points at port 54329.
- Tools time out from Bolna: the tunnel is down, or the function URL is an old hostname.
- Desk is empty: you opened `/` instead of `/?live=1`, or the console cannot reach port 8000.
- Refill approve refuses: only that patient's doctor, with their pin, after a completed visit with them in the last 180 days.
- Refund approve refuses: the admin pin, and not the same person who requested it.

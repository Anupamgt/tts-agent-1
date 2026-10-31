# Mac Mini servers

The public site and the staff console are on Vercel. The clinic API, the database, and the phone tunnel run on this Mac Mini. If the Mini is off, the website still loads and the console still opens, and both fail when they ask the API for anything. A call to the clinic number also fails, because Bolna cannot reach the tools.

Do not put real patient files on this machine. The clinic on the phone is Deskie.

## What is running

| Piece | Where it runs | How you know it is up |
|---|---|---|
| Postgres, Redis, Kafka, LiveKit | Docker, `deploy/docker-compose.yml` | `docker compose -f deploy/docker-compose.yml ps` |
| Clinic API | This Mac, port 8000 | `curl -s http://127.0.0.1:8000/healthz` returns `{"ok":true}` |
| Staff console, local only | This Mac, port 8001 | `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8001/` is 200 |
| Public tunnel | `cloudflared` on this Mac | `curl -s $PUBLIC_BASE_URL/healthz` returns `{"ok":true}` |
| Deskie site | Vercel | The marketing page |
| Staff console | A second Vercel project | Sign in from the Deskie nav |

`PUBLIC_BASE_URL` in `.env` is the tunnel. Bolna calls that host for tools, the inbound lookup, and the call webhook. The Vercel console proxies `/api` and `/v1` to the same host.

The number published on the site is the Vobiz number linked to the agent. People dial it to hear Deskie. It is not the mobile that rings when a caller asks for the desk. That mobile is `TRANSFER_TO_NUMBER` in `.env`.

Seeded files are already in Postgres: Meera, Kabir, Asha, and Rohan, plus Dr Sharma, Dr Verma, and Dr Kaur. After a desk sign-in, Records can add a clinic profile, a doctor, a patient history note, and a staff user. Those writes go to this database.

## Bring the Mini back

From the repo root, with Docker Desktop open:

```bash
docker compose -f deploy/docker-compose.yml up -d
```

API, only if port 8000 is down:

```bash
cd api
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Leave that process running. Local console, only if you want the desk on the Mini itself:

```bash
node console/server.js
```

Tunnel, only if `curl` to `PUBLIC_BASE_URL/healthz` fails. A new quick tunnel gets a new hostname. Copy that hostname into `PUBLIC_BASE_URL`, then push it to Bolna and redeploy the public pages:

```bash
cloudflared tunnel --protocol http2 --url http://127.0.0.1:8000
```

```bash
python3 agent/configure_bolna.py
bash scripts/deploy_deski.sh
```

`configure_bolna.py` rewrites the agent’s tool URLs, webhook, and inbound lookup to the new tunnel. The deploy script republishes the site and the console so they proxy to that same host. It does not restart Docker or print secrets.

Postgres loads the seed only when the volume is empty. `docker compose -f deploy/docker-compose.yml down -v` deletes the demo database, including enquiries and records added from the desk.

One API process is the whole clinic. Do not start a second copy against the same database. The desk sign-in lives in that process’s memory, so a restart asks staff to sign in again.

## Checks after a restart

```bash
curl -s http://127.0.0.1:8000/healthz
curl -s "$PUBLIC_BASE_URL/healthz"
curl -s -o /dev/null -w '%{http_code}\n' "$PUBLIC_BASE_URL/v1/public/desk"
```

The public desk route should be 200. A tool route without the tool token should be 401, which means the tunnel is reaching the API and the token check is on.

Then call the number on the Deskie page and ask what time the clinic is open.

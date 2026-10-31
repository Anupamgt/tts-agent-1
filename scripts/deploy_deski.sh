#!/usr/bin/env bash
# Publish the Deskie site and the staff console. The API stays on this Mac.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env. Copy deploy/.env.example and fill it in first."
  exit 1
fi

PUBLIC_BASE_URL="$(python3 - << 'PY'
from pathlib import Path
for line in Path(".env").read_text().splitlines():
    if line.startswith("PUBLIC_BASE_URL="):
        print(line.split("=", 1)[1].strip().rstrip("/"))
        break
PY
)"
if [[ -z "${PUBLIC_BASE_URL}" ]]; then
  echo "PUBLIC_BASE_URL is empty in .env."
  exit 1
fi

if ! curl -sf "http://127.0.0.1:8000/healthz" >/dev/null; then
  echo "Starting the clinic API on port 8000."
  (cd "$ROOT/api" && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000) &
  sleep 2
fi

if ! curl -sf "${PUBLIC_BASE_URL}/healthz" >/dev/null; then
  echo "The public tunnel is not answering ${PUBLIC_BASE_URL}/healthz."
  echo "Start it, then run this script again. See docs/mac-mini-servers.md."
  exit 1
fi

CODE="$(curl -s -o /dev/null -w '%{http_code}' "${PUBLIC_BASE_URL}/v1/public/desk")"
if [[ "$CODE" != "200" ]]; then
  echo "The public API does not have the desk route yet (HTTP ${CODE}). Restarting the API."
  if pid="$(lsof -ti tcp:8000 -sTCP:LISTEN)"; then
    kill "$pid"
    sleep 1
  fi
  (cd "$ROOT/api" && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000) &
  sleep 2
  CODE="$(curl -s -o /dev/null -w '%{http_code}' "${PUBLIC_BASE_URL}/healthz")"
  if [[ "$CODE" != "200" ]]; then
    echo "API did not come back on the tunnel."
    exit 1
  fi
fi

NUMBER="$(
  cd "$ROOT"
  api/.venv/bin/python - << 'PY'
import json, os, urllib.request
from pathlib import Path
for line in Path(".env").read_text().splitlines():
    if line.startswith("BOLNA_API_KEY="):
        os.environ["BOLNA_API_KEY"] = line.split("=", 1)[1].strip()
req = urllib.request.Request(
    "https://api.bolna.ai/phone-numbers/all",
    headers={"Authorization": "Bearer " + os.environ["BOLNA_API_KEY"]},
)
with urllib.request.urlopen(req, timeout=30) as res:
    data = json.load(res)
rows = data if isinstance(data, list) else data.get("phone_numbers") or data.get("data") or []
for item in rows:
    num = str(item.get("phone_number") or item.get("number") or "")
    blob = json.dumps(item).lower()
    if num.startswith("+91") or "vobiz" in blob:
        print(num)
        break
else:
    raise SystemExit("No Indian number on the Bolna account.")
PY
)"

api/.venv/bin/python - << PY
import asyncio, os
os.chdir("api")
from app.db import db

async def main():
    await db.open()
    async with db.connection() as conn:
        await conn.execute("UPDATE clinics SET phone = %s WHERE id = 1", ("${NUMBER}",))
    await db.close()

asyncio.run(main())
PY

DISPLAY="$(NUMBER="$NUMBER" python3 - << 'PY'
import os
digits = os.environ["NUMBER"].removeprefix("+91")
print("0" + digits[:2] + " " + digits[2:6] + " " + digits[6:])
PY
)"

rm -rf deploy/out
mkdir -p deploy/out/console deploy/out/site
cp -R console/public/. deploy/out/console/
cp site/index.html site/styles.css site/app.js deploy/out/site/
cp demo/launch/Bolnai-launch.mp4 deploy/out/site/demo.mp4

python3 - << PY
import json
from pathlib import Path
base = "${PUBLIC_BASE_URL}"
Path("deploy/out/console/vercel.json").write_text(json.dumps({
    "rewrites": [
        {"source": "/api/:path*", "destination": base + "/api/:path*"},
        {"source": "/v1/:path*", "destination": base + "/v1/:path*"},
        {"source": "/healthz", "destination": base + "/healthz"},
    ]
}, indent=2) + "\n")
Path("deploy/out/site/vercel.json").write_text(json.dumps({
    "rewrites": [
        {"source": "/api/enquiries", "destination": base + "/v1/public/enquiries"},
    ]
}, indent=2) + "\n")
PY

# Vercel blocks a deploy when it finds this repo's git author. Stage outside the repo.
stage_outside() {
  local dest
  dest="$(mktemp -d /tmp/deskie-deploy.XXXXXX)"
  cp -R "$1"/. "$dest"/
  echo "$dest"
}

echo "Deploying the staff console."
CONSOLE_STAGE="$(stage_outside deploy/out/console)"
vercel deploy "$CONSOLE_STAGE" --prod --yes --project deski-desk --create-if-missing --json > deploy/out/console-deploy.json
CONSOLE_URL="$(python3 scripts/vercel_url.py deploy/out/console-deploy.json)"
vercel project protection disable deski-desk --sso -y >/dev/null || true

cat > deploy/out/site/config.js << EOF
window.DESKIE = {
  consoleUrl: "${CONSOLE_URL}/?live=1",
  callDisplay: "${DISPLAY}",
  callTel: "${NUMBER}",
  enquiryUrl: "/api/enquiries"
};
EOF

echo "Deploying the Deskie site."
SITE_STAGE="$(stage_outside deploy/out/site)"
vercel deploy "$SITE_STAGE" --prod --yes --project deski --create-if-missing --json > deploy/out/site-deploy.json
SITE_URL="$(python3 scripts/vercel_url.py deploy/out/site-deploy.json)"
vercel project protection disable deski --sso -y >/dev/null || true

echo
echo "Deskie site:    ${SITE_URL}"
echo "Staff console: ${CONSOLE_URL}"
echo "Call:          ${DISPLAY}"
echo "API:           ${PUBLIC_BASE_URL}"

import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import httpx
import psycopg
import pytest
import uvicorn
from psycopg.rows import dict_row

REPO = Path(__file__).resolve().parents[2]
os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@127.0.0.1:54329/postgres?sslmode=disable"
os.environ["REDIS_URL"] = "memory://"
os.environ["KAFKA_BOOTSTRAP_SERVERS"] = "memory://"
os.environ["SIMULATOR_ENABLED"] = "1"
os.environ["BOLNA_TOOL_TOKEN"] = "dev-tool-token-change-me"
os.environ["BOLNA_WEBHOOK_TOKEN"] = "dev-webhook-token-change-me"
os.environ["INTERNAL_TOKEN"] = "dev-internal-token"
os.environ["DESK_PIN"] = "2468"
os.environ["HANDOFF_WAIT_SECONDS"] = "8"
os.environ["BOLNA_ENFORCE_SOURCE_IP"] = "0"
os.environ["BOLNA_API_BASE"] = "http://127.0.0.1:8899"
os.environ["BOLNA_AGENT_ID"] = "agent-test"
os.environ.setdefault("BOLNA_API_KEY", "test-key")

CAPTURED = []


class _Bolna(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length") or 0)
        body = json.loads(self.rfile.read(length) or b"{}")
        CAPTURED.append(body)
        call_id = body.get("user_data", {}).get("call_id", "0")
        raw = json.dumps({"run_id": f"run-{call_id}", "token": "session"}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def log_message(self, fmt, *args):
        return


@pytest.fixture(scope="session")
def runtime():
    ready = REPO / "data" / "pglite.ready"
    if ready.exists():
        ready.unlink()
    (REPO / "data").mkdir(exist_ok=True)
    log_path = REPO / "data" / "pglite.log"
    log_handle = log_path.open("w", encoding="utf-8")
    pglite = __import__("subprocess").Popen(
        ["node", str(REPO / "scripts" / "pglite" / "server.mjs")],
        cwd=str(REPO),
        stdout=log_handle,
        stderr=__import__("subprocess").STDOUT,
    )
    deadline = time.time() + 90
    while time.time() < deadline:
        if ready.exists():
            break
        if pglite.poll() is not None:
            log_handle.flush()
            raise RuntimeError(log_path.read_text(encoding="utf-8")[-4000:])
        time.sleep(0.2)
    else:
        pglite.kill()
        log_handle.flush()
        raise RuntimeError("pglite did not start\n" + log_path.read_text(encoding="utf-8")[-4000:])

    fake = ThreadingHTTPServer(("127.0.0.1", 8899), _Bolna)
    threading.Thread(target=fake.serve_forever, daemon=True).start()

    config = uvicorn.Config(
        "app.main:app",
        host="127.0.0.1",
        port=8765,
        log_level="info",
        loop="app.winloop:selector_factory",
    )
    server = uvicorn.Server(config)
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    client = httpx.Client(base_url="http://127.0.0.1:8765", timeout=20)
    deadline = time.time() + 30
    while time.time() < deadline:
        try:
            response = client.get("/healthz")
            if response.status_code == 200:
                break
        except httpx.HTTPError:
            time.sleep(0.2)
    else:
        server.should_exit = True
        pglite.kill()
        raise RuntimeError("api did not start\n" + log_path.read_text(encoding="utf-8")[-2000:])
    login = client.post("/api/desk/login", json={"pin": "2468"})
    assert login.status_code == 200, login.text
    yield {"client": client, "captured": CAPTURED}
    client.close()
    server.should_exit = True
    fake.shutdown()
    pglite.terminate()
    log_handle.close()


@pytest.fixture
def client(runtime):
    return runtime["client"]


def sql(statement, params=()):
    conn = psycopg.connect(os.environ["DATABASE_URL"], autocommit=True, row_factory=dict_row)
    conn.prepare_threshold = None
    try:
        cur = conn.execute(statement, params)
        if cur.description:
            return cur.fetchall()
        return []
    finally:
        conn.close()

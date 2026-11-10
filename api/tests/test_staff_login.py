"""Per-staff sign-in: PINs are checked on the server and never sent to the browser."""
import subprocess
from pathlib import Path

from app.auth import verify_pin_hash
from tests.conftest import clean_cookies, sql

REPO = Path(__file__).resolve().parents[2]
PUBLIC = {"X-Forwarded-For": "203.0.113.9"}  # arrives through the tunnel, so it is not loopback


def staff_id(role):
    return str(sql("SELECT id FROM staff_users WHERE role = %s AND active ORDER BY id LIMIT 1", (role,))[0]["id"])


def login(client, sid, pin, otp="", ip="10.0.0.1"):
    return client.post(
        "/api/desk/staff-login",
        json={"staff_id": sid, "pin": pin, "otp": otp},
        headers={"X-Forwarded-For": ip},
    )


def test_staff_list_has_no_secrets(client):
    rows = client.get("/api/desk/staff").json()
    assert rows and {"id", "name", "role", "doctorId"} <= set(rows[0])
    for row in rows:
        assert "pin" not in row and "otp" not in row


def test_receptionist_signs_in_and_snapshot_hides_pins(client):
    sid = staff_id("receptionist")
    assert login(client, sid, "0000", ip="10.0.1.1").status_code == 401
    ok = login(client, sid, "2468", ip="10.0.1.2")
    assert ok.status_code == 200, ok.text
    assert ok.json()["user"]["role"] == "receptionist"
    snap = client.get("/api/console/bootstrap", headers=PUBLIC)
    assert snap.status_code == 200, snap.text
    users = snap.json()["users"]
    assert users and all(u["pin"] == "" and u["otp"] == "" for u in users)


def test_bootstrap_needs_a_session(client):
    with clean_cookies(client):
        assert client.get("/api/console/bootstrap", headers=PUBLIC).status_code == 401


def test_admin_needs_the_code_and_doctor_pin_is_not_the_shared_pin(client):
    admin = staff_id("admin")
    assert login(client, admin, "1357", ip="10.0.2.1").status_code == 401
    assert login(client, admin, "1357", otp="000000", ip="10.0.2.2").status_code == 401
    assert login(client, admin, "1357", otp="190026", ip="10.0.2.3").status_code == 200
    doctor = staff_id("doctor")
    assert login(client, doctor, "2468", ip="10.0.2.4").status_code == 401  # the shared desk PIN is not a doctor PIN
    assert login(client, "not-a-number", "2468", ip="10.0.2.5").status_code == 401


def test_repeated_wrong_pins_are_throttled(client):
    sid = staff_id("receptionist")
    for _ in range(5):
        assert login(client, sid, "9999", ip="10.0.3.1").status_code == 401
    locked = login(client, sid, "2468", ip="10.0.3.1")
    assert locked.status_code == 429
    assert int(locked.headers["Retry-After"]) > 0
    assert login(client, sid, "2468", ip="10.0.3.2").status_code == 200  # other addresses are unaffected


def test_hash_written_by_the_node_side_verifies_here():
    out = subprocess.run(
        ["node", "--input-type=module", "-e", "import { hashPin } from './server/src/pins.js'; console.log(hashPin('4321'))"],
        cwd=str(REPO), capture_output=True, text=True, check=True,
    ).stdout.strip()
    assert out.startswith("scrypt$")
    assert verify_pin_hash("4321", out)
    assert not verify_pin_hash("4322", out)
    assert not verify_pin_hash("4321", "plaintext")


def test_staff_with_a_hash_signs_in_by_hash(client):
    out = subprocess.run(
        ["node", "--input-type=module", "-e", "import { hashPin } from './server/src/pins.js'; console.log(hashPin('7788'))"],
        cwd=str(REPO), capture_output=True, text=True, check=True,
    ).stdout.strip()
    sid = staff_id("assistant") if sql("SELECT 1 FROM staff_users WHERE role = 'assistant'") else staff_id("doctor")
    cols = {r["column_name"] for r in sql("SELECT column_name FROM information_schema.columns WHERE table_name = 'staff_users'")}
    if "pin_hash" not in cols:
        sql("ALTER TABLE staff_users ADD COLUMN pin_hash text, ADD COLUMN pin_updated_at timestamptz")
    sql("UPDATE staff_users SET pin_hash = %s WHERE id = %s", (out, int(sid)))
    assert login(client, sid, "7788", ip="10.0.4.1").status_code == 200
    plain = sql("SELECT pin FROM staff_users WHERE id = %s", (int(sid),))[0]["pin"]
    assert login(client, sid, plain, ip="10.0.4.2").status_code == 401  # the hash wins once it is set
    sql("UPDATE staff_users SET pin_hash = NULL WHERE id = %s", (int(sid),))


def test_logout_ends_the_session(client):
    with clean_cookies(client):
        sid = staff_id("receptionist")
        assert login(client, sid, "2468", ip="10.0.5.1").status_code == 200
        assert client.get("/api/console/bootstrap", headers=PUBLIC).status_code == 200
        assert client.post("/api/desk/logout", headers=PUBLIC).status_code == 200
        assert client.get("/api/console/bootstrap", headers=PUBLIC).status_code == 401

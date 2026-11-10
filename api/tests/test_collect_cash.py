"""Cash collected at the desk is recorded as a payment and marks the booking paid."""
from tests.conftest import clean_cookies, sql

PUBLIC = {"X-Forwarded-For": "203.0.113.7"}


def walk_in(client, name, phone, doctor_id):
    res = client.post("/api/walk-ins", json={"full_name": name, "phone": phone, "doctor_id": doctor_id})
    assert res.status_code == 200, res.text
    return res.json()["booking_id"]


def fee_doctor():
    return int(sql("SELECT id FROM doctors WHERE appointment_fee_inr > 0 ORDER BY id LIMIT 1")[0]["id"])


def test_collect_cash_records_a_payment(client):
    booking = walk_in(client, "Cash Test One", "9833300001", fee_doctor())
    assert sql("SELECT payment_status FROM bookings WHERE id = %s", (booking,))[0]["payment_status"] == "pending"
    first = client.post(f"/api/bookings/{booking}/collect-cash")
    assert first.status_code == 200, first.text
    row = sql("SELECT method, status, amount_inr FROM payments WHERE booking_id = %s", (booking,))
    assert len(row) == 1 and row[0]["method"] == "cash_desk" and row[0]["status"] == "paid"
    assert sql("SELECT payment_status FROM bookings WHERE id = %s", (booking,))[0]["payment_status"] == "paid"
    again = client.post(f"/api/bookings/{booking}/collect-cash")
    assert again.status_code == 200
    assert len(sql("SELECT id FROM payments WHERE booking_id = %s", (booking,))) == 1  # idempotent


def test_collect_cash_records_who_took_it_and_needs_a_session(client):
    booking = walk_in(client, "Cash Test Two", "9833300002", fee_doctor())
    with clean_cookies(client):
        assert client.post(f"/api/bookings/{booking}/collect-cash", headers=PUBLIC).status_code in (401, 404)
        sid = str(sql("SELECT id FROM staff_users WHERE role = 'receptionist' AND active LIMIT 1")[0]["id"])
        login = client.post("/api/desk/staff-login", json={"staff_id": sid, "pin": "2468"}, headers={"X-Forwarded-For": "10.0.9.1"})
        assert login.status_code == 200, login.text
        assert client.post(f"/api/bookings/{booking}/collect-cash", headers=PUBLIC).status_code == 200
        assert sql("SELECT collected_by FROM payments WHERE booking_id = %s", (booking,))[0]["collected_by"] == int(sid)


def test_collect_cash_refuses_when_no_fee_is_due(client):
    free = sql("SELECT id FROM doctors WHERE appointment_fee_inr = 0 ORDER BY id LIMIT 1")
    if free:
        booking = walk_in(client, "Cash Test Three", "9833300003", int(free[0]["id"]))
        assert client.post(f"/api/bookings/{booking}/collect-cash").status_code == 409
    assert client.post("/api/bookings/999999/collect-cash").status_code == 404

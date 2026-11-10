"""Wire a Vobiz SIP trunk to LiveKit, check it, and place a test call.

    python sip_setup.py check            # what LiveKit has now, and what is missing
    python sip_setup.py inbound          # inbound trunk + dispatch rule (Vobiz -> LiveKit -> agent)
    python sip_setup.py outbound         # outbound trunk (agent -> LiveKit -> Vobiz -> phone)
    python sip_setup.py call +9198...    # dial a phone through the outbound trunk with the agent

All values come from voice/.env (see .env.example). Running inbound or outbound
twice is safe: an existing trunk with the same name is updated, not duplicated.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from livekit import api

load_dotenv(Path(__file__).resolve().parent / ".env")

AGENT_NAME = os.getenv("AGENT_NAME", "deskie")
INBOUND_NAME = "Vobiz inbound (Deskie)"
OUTBOUND_NAME = "Vobiz outbound (Deskie)"
RULE_NAME = "Deskie inbound dispatch"


def need(name: str) -> str:
    value = (os.getenv(name) or "").strip()
    if not value:
        raise SystemExit(f"{name} is not set in voice/.env")
    return value


def e164(number: str) -> str:
    digits = "".join(ch for ch in number if ch.isdigit())
    if len(digits) == 10:
        digits = "91" + digits
    return "+" + digits


async def find_inbound(lk: api.LiveKitAPI):
    res = await lk.sip.list_inbound_trunk(api.ListSIPInboundTrunkRequest())
    return next((t for t in res.items if t.name == INBOUND_NAME), None)


async def find_outbound(lk: api.LiveKitAPI):
    res = await lk.sip.list_outbound_trunk(api.ListSIPOutboundTrunkRequest())
    return next((t for t in res.items if t.name == OUTBOUND_NAME), None)


async def find_rule(lk: api.LiveKitAPI):
    res = await lk.sip.list_dispatch_rule(api.ListSIPDispatchRuleRequest())
    return next((r for r in res.items if r.name == RULE_NAME), None)


async def inbound(lk: api.LiveKitAPI) -> None:
    number = e164(need("VOBIZ_NUMBER"))
    info = api.SIPInboundTrunkInfo(name=INBOUND_NAME, numbers=[number], krisp_enabled=True)
    # Optional digest auth: only set if the Vobiz trunk is configured to send credentials.
    if os.getenv("VOBIZ_INBOUND_USERNAME"):
        info.auth_username = need("VOBIZ_INBOUND_USERNAME")
        info.auth_password = need("VOBIZ_INBOUND_PASSWORD")
    existing = await find_inbound(lk)
    if existing:
        await lk.sip.delete_sip_trunk(api.DeleteSIPTrunkRequest(sip_trunk_id=existing.sip_trunk_id))
    trunk = await lk.sip.create_sip_inbound_trunk(api.CreateSIPInboundTrunkRequest(trunk=info))
    print(f"inbound trunk {trunk.sip_trunk_id} for {number}")

    rule = await find_rule(lk)
    if rule:
        await lk.sip.delete_sip_dispatch_rule(api.DeleteSIPDispatchRuleRequest(sip_dispatch_rule_id=rule.sip_dispatch_rule_id))
    created = await lk.sip.create_sip_dispatch_rule(
        api.CreateSIPDispatchRuleRequest(
            name=RULE_NAME,
            trunk_ids=[trunk.sip_trunk_id],
            rule=api.SIPDispatchRule(dispatch_rule_individual=api.SIPDispatchRuleIndividual(room_prefix="call-")),
            room_config=api.RoomConfiguration(agents=[api.RoomAgentDispatch(agent_name=AGENT_NAME)]),
        )
    )
    print(f"dispatch rule {created.sip_dispatch_rule_id}: each call gets its own call-* room with agent '{AGENT_NAME}'")
    print()
    print("Now in the Vobiz console, set the trunk's inbound destination to your LiveKit SIP URI")
    print("(LiveKit Cloud > Settings > Project > SIP URI), written WITHOUT the 'sip:' prefix,")
    print("and link the number to that trunk.")


async def outbound(lk: api.LiveKitAPI) -> None:
    info = api.SIPOutboundTrunkInfo(
        name=OUTBOUND_NAME,
        address=need("VOBIZ_SIP_DOMAIN"),
        numbers=[e164(need("VOBIZ_NUMBER"))],
        auth_username=need("VOBIZ_USERNAME"),
        auth_password=need("VOBIZ_PASSWORD"),
    )
    existing = await find_outbound(lk)
    if existing:
        await lk.sip.delete_sip_trunk(api.DeleteSIPTrunkRequest(sip_trunk_id=existing.sip_trunk_id))
    trunk = await lk.sip.create_sip_outbound_trunk(api.CreateSIPOutboundTrunkRequest(trunk=info))
    print(f"outbound trunk {trunk.sip_trunk_id} via {info.address}")
    print(f"set SIP_OUTBOUND_TRUNK_ID={trunk.sip_trunk_id} in voice/.env")


async def check(lk: api.LiveKitAPI) -> None:
    ok = True
    ib, ob, rule = await find_inbound(lk), await find_outbound(lk), await find_rule(lk)
    if ib:
        print(f"[ok] inbound trunk {ib.sip_trunk_id} numbers={list(ib.numbers)} krisp={ib.krisp_enabled}")
    else:
        ok = False
        print("[missing] inbound trunk: run `python sip_setup.py inbound`")
    if rule:
        agents = [a.agent_name for a in rule.room_config.agents] if rule.HasField("room_config") else []
        print(f"[ok] dispatch rule {rule.sip_dispatch_rule_id} trunks={list(rule.trunk_ids)} agents={agents}")
        if ib and ib.sip_trunk_id not in rule.trunk_ids:
            ok = False
            print("[warn] dispatch rule does not point at the inbound trunk: rerun inbound")
        if AGENT_NAME not in agents:
            ok = False
            print(f"[warn] dispatch rule does not dispatch agent '{AGENT_NAME}'")
    else:
        ok = False
        print("[missing] dispatch rule: run `python sip_setup.py inbound`")
    if ob:
        print(f"[ok] outbound trunk {ob.sip_trunk_id} address={ob.address} numbers={list(ob.numbers)}")
        if os.getenv("SIP_OUTBOUND_TRUNK_ID") != ob.sip_trunk_id:
            print(f"[warn] SIP_OUTBOUND_TRUNK_ID in .env should be {ob.sip_trunk_id}")
    else:
        print("[info] no outbound trunk (only needed for outbound calls): `python sip_setup.py outbound`")
    rooms = await lk.room.list_rooms(api.ListRoomsRequest())
    live = [r.name for r in rooms.rooms if r.name.startswith("call-")]
    print(f"[info] live call rooms: {live or 'none'}")
    print("\nall good: call the Vobiz number now" if ok else "\nfix the items above")


async def call(lk: api.LiveKitAPI, number: str) -> None:
    trunk_id = need("SIP_OUTBOUND_TRUNK_ID")
    room = f"call-out-{e164(number)[1:]}"
    dispatch = await lk.agent_dispatch.create_dispatch(
        api.CreateAgentDispatchRequest(
            agent_name=AGENT_NAME,
            room=room,
            metadata=json.dumps({"phone_number": e164(number), "trunk_id": trunk_id}),
        )
    )
    print(f"dispatched agent '{AGENT_NAME}' to {room} ({dispatch.id}); the agent dials {e164(number)}")
    print("watch the worker log: 'call answered' means the Vobiz outbound leg works")


async def main() -> None:
    cmd = sys.argv[1] if len(sys.argv) > 1 else "check"
    lk = api.LiveKitAPI()
    try:
        if cmd == "inbound":
            await inbound(lk)
        elif cmd == "outbound":
            await outbound(lk)
        elif cmd == "check":
            await check(lk)
        elif cmd == "call" and len(sys.argv) > 2:
            await call(lk, sys.argv[2])
        else:
            raise SystemExit(__doc__)
    finally:
        await lk.aclose()


if __name__ == "__main__":
    asyncio.run(main())

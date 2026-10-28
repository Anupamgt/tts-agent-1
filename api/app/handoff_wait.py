import asyncio

waiters: dict[int, dict] = {}


def prime(call_id: int) -> asyncio.Event:
    event = asyncio.Event()
    waiters[int(call_id)] = {"event": event, "result": None}
    return event


async def wait_for_desk(call_id: int, timeout: float):
    slot = waiters.get(int(call_id))
    if slot is None:
        return None
    try:
        await asyncio.wait_for(slot["event"].wait(), timeout)
    except TimeoutError:
        return None
    return slot.get("result")


def notify(call_id: int, result: dict) -> bool:
    slot = waiters.get(int(call_id))
    if slot is None:
        return False
    slot["result"] = result
    slot["event"].set()
    return True


def pop(call_id: int):
    waiters.pop(int(call_id), None)

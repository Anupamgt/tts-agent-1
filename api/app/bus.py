from collections import defaultdict

from app.metrics import metrics


class MemoryRedis:
    def __init__(self):
        self.hashes: dict[str, dict] = {}
        self.values: dict[str, str] = {}
        self.channels: dict[str, list] = defaultdict(list)

    async def hset(self, key: str, mapping: dict):
        bucket = self.hashes.setdefault(key, {})
        bucket.update({k: "" if v is None else str(v) for k, v in mapping.items()})

    async def hgetall(self, key: str) -> dict:
        return dict(self.hashes.get(key, {}))

    async def set(self, key: str, value: str, ex: int | None = None):
        self.values[key] = value

    async def get(self, key: str):
        return self.values.get(key)

    def subscribe(self, *channels: str):
        queue: list = []
        # asyncio.Queue is created lazily so import does not require a running loop
        import asyncio

        q = asyncio.Queue()
        queue.append(q)
        for channel in channels:
            self.channels[channel].append(q)
        return q

    def unsubscribe(self, queue, *channels: str):
        for channel in channels:
            subs = self.channels.get(channel, [])
            if queue in subs:
                subs.remove(queue)

    async def publish(self, channel: str, message: dict):
        for queue in list(self.channels.get(channel, [])):
            await queue.put(message)


class MemoryKafka:
    def __init__(self):
        self.topics: dict[str, list] = defaultdict(list)
        self.dlq: list = []
        self.broken = False
        self.attempts: dict[str, int] = {}

    async def publish(self, topic: str, message: dict) -> bool:
        if self.broken:
            metrics.inc("clinic_trace_publish_failures_total", topic=topic)
            return False
        self.topics[topic].append(message)
        return True

    async def deliver_trace(self, message: dict):
        from app.traces import index_envelope

        event_id = str(message.get("event_id") or "")
        last_error = "unknown"
        for _ in range(3):
            try:
                await index_envelope(message.get("body") or {})
                return
            except Exception as exc:
                last_error = str(exc)
                self.attempts[event_id] = self.attempts.get(event_id, 0) + 1
        self.dlq.append(
            {
                "topic": "clinic.trace.events",
                "event_id": event_id,
                "error": last_error,
                "message": message,
            }
        )


redis_bus = MemoryRedis()
kafka_bus = MemoryKafka()

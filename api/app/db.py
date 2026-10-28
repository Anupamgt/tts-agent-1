from contextlib import asynccontextmanager

import psycopg
from psycopg.rows import dict_row

from app.config import DATABASE_URL


class Database:
    def __init__(self, dsn: str):
        self.dsn = dsn
        self.conn: psycopg.AsyncConnection | None = None
        self._lock = None

    async def open(self):
        import asyncio

        if self._lock is None:
            self._lock = asyncio.Lock()
        self.conn = await psycopg.AsyncConnection.connect(
            self.dsn, autocommit=True, row_factory=dict_row
        )
        self.conn.prepare_threshold = None

    async def close(self):
        if self.conn is not None and not self.conn.closed:
            await self.conn.close()

    @asynccontextmanager
    async def connection(self):
        import asyncio

        if self._lock is None:
            self._lock = asyncio.Lock()
        async with self._lock:
            if self.conn is None or self.conn.closed:
                await self.open()
            if self.conn.info.transaction_status == psycopg.pq.TransactionStatus.INERROR:
                await self.conn.rollback()
            yield self.conn


db = Database(DATABASE_URL)


async def one(conn, sql, params=()):
    cur = await conn.execute(sql, params)
    return await cur.fetchone()


async def many(conn, sql, params=()):
    cur = await conn.execute(sql, params)
    return await cur.fetchall()

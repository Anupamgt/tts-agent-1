import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.db import db
from app.desk_routes import router as desk_router
from app.jobs import run_jobs
from app.routes import router

log = logging.getLogger("clinic")


async def _jobs_loop():
    while True:
        await asyncio.sleep(60)
        try:
            await run_jobs()
        except Exception:
            log.exception("desk jobs")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.basicConfig(level=logging.INFO)
    await db.open()
    task = asyncio.create_task(_jobs_loop())
    log.info("clinic api ready")
    try:
        yield
    finally:
        task.cancel()
        await db.close()


app = FastAPI(lifespan=lifespan)
app.include_router(router)
app.include_router(desk_router)

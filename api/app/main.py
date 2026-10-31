import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import db
from app.desk_routes import router as desk_router
from app.jobs import run_jobs
from app.public_routes import router as public_router
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
    try:
        await run_jobs()
    except Exception:
        log.exception("startup jobs")
    task = asyncio.create_task(_jobs_loop())
    log.info("clinic api ready")
    try:
        yield
    finally:
        task.cancel()
        await db.close()


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["content-type"],
)
app.include_router(router)
app.include_router(desk_router)
app.include_router(public_router)

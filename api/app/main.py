import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.db import db
from app.routes import router

log = logging.getLogger("clinic")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.basicConfig(level=logging.INFO)
    await db.open()
    log.info("clinic api ready")
    yield
    await db.close()


app = FastAPI(lifespan=lifespan)
app.include_router(router)

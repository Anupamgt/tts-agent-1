import asyncio
import selectors


def selector_factory():
    """psycopg async connections do not run on Windows ProactorEventLoop."""
    return asyncio.SelectorEventLoop(selectors.SelectSelector())

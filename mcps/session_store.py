import logging, sys

logger = logging.getLogger("runner")
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

import os
import redis
import json
from datetime import timedelta

    
# ------- Testing Redis connection ---------
def redis_test():
    try:
        redis_client.ping()
        logger.info("Redis connected successfully.")
    except redis.exceptions.ConnectionError:
        logger.error("Redis connection failed — check REDIS_HOST/PORT")

# ------------ Redis Server Side ---------------
_redis_pool = None

def get_redis_client():
    ''' Function for connecting to redis server '''
    global _redis_pool
    if not _redis_pool:
        _redis_pool = redis.ConnectionPool(
            host=os.getenv("HOST"),
            port=6379,
            decode_responses=True,
            max_connections=3,
        )
    return redis.Redis(connection_pool=_redis_pool)

redis_client = get_redis_client()

# Using Redis to store session state
async def save_session(session_id: str, data_path: str):
    """Stores session data in Redis."""
    redis_client.set(session_id, data_path)
    redis_client.expire(session_id, timedelta(hours=1))  # auto-clean after 1 hour
    logger.info(f"Session {session_id} saved in Redis with path: {data_path}")

async def get_session_data(session_id: str):
    ''' Retrieve session info '''
    data = redis_client.get(session_id)
    return data



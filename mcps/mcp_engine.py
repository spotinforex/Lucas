import logging, sys

# Log to stderr so stdout is reserved for protocol messages
logger = logging.getLogger("runner")
logging.basicConfig(
    stream=sys.stderr,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

from mcp.server.fastmcp import FastMCP, Context
from mcp.server.session import ServerSession
from data_tool import get_data
from sandbox_tool import sandbox_executor
from session_store import redis_test, get_redis_client, save_session, get_session_data, redis_client

mcp = FastMCP("LucasAI Server")

# testing Redis Server
test = redis_test()

# ----------- MCP Tools --------------------

@mcp.tool("Data_API", description="Retrieves Finance Data")
async def data_loader(ticker: str,
    start_period: str,
    end_period: str,
    interval: str,
    session_id: str,
    ctx: Context[ServerSession, None]) -> str:
    '''
    Retrieves data for stock, forex, crypto, ETFs, bonds, indices.
    Args:
        ticker: Ticker symbol (e.g., "MSFT","EUR/USD","BTC/USD")
        start_period: Start date in YYYY-MM-DD format
        end_period: End date in YYYY-MM-DD format
        interval: Interval for data ('1min', '5min', '15min', '30min', '1h','2h', '4h','1day', '1week', '1month')
        session_id: Each User instance id
        ctx: Mcp Server Session
    Returns:
        str: JSON string of price data (preview)
    '''
    preview, datapath = await get_data(ticker, start_period, end_period, interval, ctx)

    # Store in Redis
    await save_session(session_id, datapath)
    
    logger.info(f"Preview:{preview}_Session ID:{session_id}_Datapath:{datapath}")
    return preview

@mcp.tool("Sandbox_Executor", description = "Execute Strategy Script in Sandbox Environment")
async def sandbox_runner(local_script_path:str, strategy_name:str, session_id: str):
    '''
    Runs Generate Strategy Script in Google Cloud Sandbox Environment
    Args:
        local_script_path: path to the backtest code file
        strategy_name: A short name to identify each strategy
        session: Each User instance id
    Return:
        Output Metrics of backtest
    '''
    local_data_path = await get_session_data(session_id)
    if not local_data_path:
        raise ValueError("Data path not found for session")

    metrics = await sandbox_executor(local_script_path, local_data_path, strategy_name)
    return metrics

if __name__ == "__main__":
    mcp.run(transport="stdio")



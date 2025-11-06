import logging,sys
logger = logging.getLogger("runner")
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)

from google.cloud import storage
from google.adk.agents import LlmAgent as LLMAgent, LoopAgent
from google.adk.tools.agent_tool import AgentTool
from google.adk.runners import Runner
from google.adk.sessions import DatabaseSessionService
from google.genai import types
from google.adk.tools.tool_context import ToolContext
import os, re, uuid, requests,tempfile,json
from dotenv import load_dotenv
from .system_instructions import read_system_instructions

#load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
FASTAPI_URL = os.getenv("MCP")
MODEL = "gemini-2.5-flash"
MODEL_2 = "gemini-2.5-pro"
BUCKET = os.environ.get("BUCKET")
PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT")

# --- Tool Processess ---

def call_fastapi_tool(tool_name, args):
    ''' Calls the MCP Server '''
    resp = requests.post(f"{FASTAPI_URL}/calltool", json={"tool_name": tool_name, "args": args})
    return resp.json()

def data_retriever(ticker: str,
    start_period: str,
    end_period: str,
    interval: str) -> str:
    '''
    Retrieves data for stock, forex, crypto, ETFs, bonds, indices.
    Args:
        ticker: Unique ticker for each public financial trading asset (e.g., "BTC/USD","AAPL")
        start_period: Start date for the finance data to be retrieved (e.g., "2021-05-17 15:00:00")
        end_period: End date for the finance data to be retrieved (e.g., "2022-09-08 15:00:00")
        interval: timeframe to which the financial trading asset would be retrieved in ("1min","5min","15min","30min","1h","2h","4h","8h","1day","1week","1month")
    Returns:
        str: JSON string of price data
    '''
    try:
        tool_name = "Data_API"
        tool_args = {
            "ticker": ticker,
            "start_period": start_period,
            "end_period": end_period,
            "interval": interval
            }
        id = uuid.uuid4().hex[:8]
        logger.info(f" Calling Tool: {tool_name}, Args: {tool_args}, Session_id: {id}")
        tool_args['session_id'] = id
        response = call_fastapi_tool(tool_name, tool_args)
        logger.info( f" Tool Called Successfully {response}")
        result = {'Response': response, 'Session Id': id}
        return result
    except Exception as e:
        logger.error(f" An Error Occurred when Calling Tool Data_API: {e}")

def sandbox_runner(gcs_script_path: str, strategy_name: str, session_id: str):
    '''
    Executes Generated Strategy Scripts in a Secured Sandbox Environment
    Args:
        gcs_script_path: Path to the saved strategy script 
        strategy_name: Strategy Name that summarizes the strategy in one word (e.g., "OrderblockStrategy")
        session_id: the session id provided during the data retrival
    Return:
        Output metrics for strategy in json format
    '''
    try:
        tool_name = "Sandbox_Executor"
        tool_args = {
            "local_script_path": gcs_script_path,
            "strategy_name": strategy_name,
            "session_id": session_id
            }
        logger.info(f" Calling Tool: {tool_name}, Args: {tool_args}")
        response = call_fastapi_tool(tool_name, tool_args)
        logger.info( f" Tool Called Successfully {response}")
        return response
    except Exception as e:
        logger.error(f" An Error Occurred when Calling Tool Sandbox_Executor: {e}")

def sanitize_filename(name):
    '''Ensures file name doesn't create conflict when saving files with them '''
    return re.sub(r"[^\w\-_.]", "_", name)

def upload_file(local_path, gcs_path):
    '''
    Uploads File to GCS BUCKET 
    Args: 
        local_path: path to local python code file
        gcs_path: GCS bucket path to save the file
    Returns:
        gcs file path 
    '''
    try:
        logging.info(f"Uploading {local_path} to {gcs_path} in Progress")
        client = storage.Client(project = PROJECT)
        bucket = client.bucket(BUCKET)
        blob = bucket.blob(gcs_path)
        blob.upload_from_filename(local_path)
        cloud_path = f"gs://{BUCKET}/{gcs_path}"
        logging.info(f" File Uploaded Successfully. Path: {cloud_path}")
        return cloud_path
    except Exception as e:
        logging.error(f" Failed to Upload File: {e}")
        raise

def code_veiwer(filepath: str) -> str:
    """
    Displays Trading Strategy Python Code
    Args:
        filepath: Path to the Trading Strategy Python File
    Returns:
        Python strategy code or an error message
    """
    try:
        logger.info(f"Viewing code for {filepath} in progress...")
        bucket_name, blob_path = filepath.replace("gs://", "").split("/", 1)
        client = storage.Client()
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(blob_path)
        code_text = blob.download_as_text()
        return code_text
    except Exception as e:
        logger.error(f"Error downloading file from GCS: {e}")
        return f"Error: {e}"

def code_saver(code: str, ticker:str, interval:str) -> str:
    '''
    Saves generated strategy script in a local folder
    Args:
        code: Generated code to be saved in a .py file in a ```python ... ``` markdown format
        ticker: Unique ticker for each public financial trading asset (e.g., "BTC/USD","AAPL")
        interval: Timeframe to which the financial trading asset would be retrieved in (e.g., '1day', '1h')
    Return:
        Saved Path to Strategy Script
    '''
    try:
        logger.info("Saving File in Progress")
        uid = uuid.uuid4().hex[:8]
        tmpdir = tempfile.mkdtemp()
        clean_ticker = sanitize_filename(ticker)
        output_name = f"{clean_ticker}_{interval}_{uid}.py"
        output_file = os.path.join(tmpdir, output_name)
        code_blocks = re.findall(r"```python(.*?)```", code, re.DOTALL)
        if not code_blocks:
            return "Failed to find code inside markdown ```python ... ```, ensure it is written in that markdown format"
        python_code = "\n".join(code_blocks).strip()
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(python_code)
        logger.info(f" File Saved Successfully: {output_file}")
        cloud_path = upload_file(output_file,f"scripts/{output_name}")
        return cloud_path
    except Exception as e:
        logger.error(f" An Error Occurred while saving file: {e}")

def exit_loop(tool_context: ToolContext):
    ''' Call this function only when the performance metrics have been outputted signaling no further refinement and the iterative process should end '''
    logger.info(f" [Tool Call] exit_loop triggered by {tool_context.agent_name}")
    tool_context.actions.escalate = True
    # Returning empty dict as tools must return a json output
    return {}

# --- Agents Processess ---
simple_builder_instructions = read_system_instructions("Lucas-agent-app/instructions/simple_instruction.txt")

# -------- Sub Agent 1----------
simple_builder = LLMAgent(
    name="simple_builder",
    model=MODEL_2,
    description="Generates trading strategies scripts Based on the users strategy.",
    instruction = simple_builder_instructions,
    tools=[data_retriever, code_saver],
    output_key = "simple_script"   # Save result to state
)

complex_system_instructions = read_system_instructions("Lucas-agent-app/instructions/complex_instruction.txt")

# ---------- Sub Agent 2 -----------
complex_builder = LLMAgent(
    name="complex_builder",
    model=MODEL_2,
    description="Generates trading strategies scripts Based on the users strategy.",
    instruction=complex_system_instructions,
    tools=[data_retriever, code_saver],
    output_key = "complex_script"
)

# ----------- Sub Agent 3 ---------------
tester_system_instructions = read_system_instructions("Lucas-agent-app/instructions/tester_instruction.txt")

tester_agent = LLMAgent(
    name="tester_agent",
    model=MODEL,
    description="Tests strategy performance and provides structured feedback.",
    instruction=tester_system_instructions,
    tools=[sandbox_runner, code_veiwer],
    output_key = "tester_response"
)

# --------------- Exit Agent ----------------
exit_system_instructions = read_system_instructions("Lucas-agent-app/instructions/exit_instruction.txt")

exit_agent = LLMAgent(
    name="exit_agent",
    model=MODEL,
    description="Calls the exit loop if performance metrics are outputted.",
    instruction=exit_system_instructions,
    tools=[exit_loop],
    output_key = "exit_response"
)

#------------ Duplicating tester and exit agent to call them from different loops ----------------------
tester_agent2 = LLMAgent(
    name="tester_agent2",
    model=MODEL,
    description="Tests strategy performance and provides structured feedback.",
    instruction=tester_system_instructions,
    tools=[sandbox_runner, code_veiwer],
    output_key = "tester_response2"
)

# --------------- Exit Agent ----------------

exit_agent2 = LLMAgent(
    name="exit_agent2",
    model=MODEL,
    description="Calls the exit loop if performance metrics are outputted.",
    instruction=exit_system_instructions,
    tools=[exit_loop],
    output_key = "exit_response2"
)

# --------- Loop Agent 1 ---------
loop_simple_agent = LoopAgent(
    name = "Lucas_Simple_Loop_Agent",
    max_iterations = 3,
    sub_agents = [simple_builder,
                  tester_agent,
                  exit_agent]
)

# --------- Loop Agent 2 ---------
loop_complex_agent = LoopAgent(
    name = "Lucas_Complex_Loop_Agent",
    max_iterations = 3,
    sub_agents = [complex_builder,
                  tester_agent2,
                  exit_agent2]
)

# -----------Root Agent --------------
conversation_builder_instructions = read_system_instructions("Lucas-agent-app/instructions/conversation_instruction.txt")

conversation_agent = LLMAgent(
    name="conversation_agent",
    model=MODEL,
    description="The main conversation agent — decides if a strategy is simple or complex and routes accordingly.",
    instruction= conversation_builder_instructions,
    sub_agents = [loop_simple_agent,
                  loop_complex_agent],
    output_key = "conversation_script" # Save result to state
)


USER_ID = '123'
SESSION_ID = '456'

# -------- Agent Team --------
root_agent = conversation_agent

#-------- Memory Store -----------
db_url = os.getenv("url")
session_service = DatabaseSessionService(db_url=db_url)
session = session_service.create_session(app_name = "agents", user_id = USER_ID, session_id = SESSION_ID)
runner = Runner(agent= root_agent, app_name="agents", session_service=session_service)

# Agent Interaction

def call_agent(query):
    content = types.Content(role = 'user', parts = [types.Part(text = query)])
    events = runner.run( user_id = USER_ID, session_id = SESSION_ID, new_message = content)

    for event in events:
        if event.is_final_response():
            final_reponse = event.content.parts[0].text
            print("Agent Response: ", final_reponse)
    return final_reponse

if __name__ == "__main__":
    call_agent( "Using the microsoft stock, if i use just 200000 usd, and use  a lot size of 0.5 my strategy is to buy below the 50 percent of the fibonacci indicator and sell off above the 100 of the fibonacci with a stop loss of 0 percent of the fiboncci and the setup is only valid if an order block appear on those key levels. using the 1hr timeframe backtest on the last one year")


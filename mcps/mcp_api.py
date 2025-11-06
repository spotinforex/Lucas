from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from mcp_client import MCPProcess
import logging, os

# FastAPI app
app = FastAPI(title="Lucas MCP SERVER")

# Global MCP process instance
mcp_process: MCPProcess | None = None


class ToolRequest(BaseModel):
    tool_name: str
    args: dict

@app.on_event("startup")
async def startup_event():
    global mcp_process
    if mcp_process is None:
        mcp_process = MCPProcess("mcp_engine.py")
    try:
        await mcp_process.start()
    except Exception as e:
        mcp_process = None
        logging.error(f"MCP failed to start {e}")


@app.get("/toolslist")
async def list_tools():
    if not mcp_process or not mcp_process.session:
        raise HTTPException(status_code=400, detail="MCP server not running")
    try:
        tools = await mcp_process.list_tools()
        logging.info(f" MCP Tools: {tools}")
        return {"tools": tools}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/calltool")
async def call_tool(request: ToolRequest):
    if not mcp_process or not mcp_process.session:
        raise HTTPException(status_code=400, detail="MCP server not running")
    try:
        result = await mcp_process.call_tool(request.tool_name, request.args)
        logging.info(f"Called Tool Response: {result}")
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.on_event("shutdown")
async def stop_server():
    global mcp_process
    if mcp_process is not None:
        await mcp_process.stop()
        mcp_process = None


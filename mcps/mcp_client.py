import asyncio
import subprocess
import sys
import logging
from contextlib import AsyncExitStack

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
import os

logging.basicConfig(level=logging.INFO)

env_vars = os.environ.copy()

class MCPProcess:
    def __init__(self, server_path: str):
        self.server_path = server_path
        self.session: ClientSession | None = None
        self.process = None
        self.exit_stack = AsyncExitStack()

    async def start(self):
        """Start the MCP server process and connect the client."""
        try:
            logging.info(f"Starting MCP server: {self.server_path}")

            server_params = StdioServerParameters(
                command=sys.executable,  # use current python
                args=[self.server_path],
                env=env_vars
            )

            stdio = await self.exit_stack.enter_async_context(stdio_client(server_params))
            self.stdio, self.write = stdio
            self.session = await self.exit_stack.enter_async_context(
                ClientSession(self.stdio, self.write)
            )

            await self.session.initialize()
            logging.info("MCP server started and client session initialized")
        except Exception as e:
            logging.error(f"An Error Occurred While Starting Server Process {e}")
            raise

    async def list_tools(self):
        """Get available tools from the server."""
        try:
            response = await self.session.list_tools()
            return response.tools
        except Exception as e:
            logging.error(f" An Error Occurred While Getting available tools {e}")
            raise

    async def call_tool(self, tool_name: str, args: dict):
        """Call a tool on the server."""
        try:
            result = await self.session.call_tool(tool_name, args)
            return result.content
        except Exception as e:
            logging.error(f" An Error Occurred While Calling Tool {e}")
            raise

    async def stop(self):
        """Stop the MCP server process."""
        try:
            if self.process:
                self.process.terminate()
                await self.process.wait()
            logging.info("MCP server stopped")
        except Exception as e:
            logging.error(f"An Error Occurred While Stopping Server {e}")


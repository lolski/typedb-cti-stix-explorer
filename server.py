#!/usr/bin/env python3
"""
STIX Q&A Server - Flask + FastMCP Client (HTTP transport)
"""

from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
from fastmcp import Client
import asyncio

app = Flask(__name__, static_folder='ui')
CORS(app)

MCP_URL = "http://localhost:8001/mcp"


async def call_mcp_tool(tool_name: str, arguments: dict):
    """Call MCP tool using FastMCP client with HTTP transport"""
    async with Client(MCP_URL) as client:
        result = await client.call_tool(tool_name, arguments)
        return result


def run_async(coro):
    """Run async coroutine from sync Flask"""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If there's already a running loop, create a new one
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(asyncio.run, coro)
                return future.result()
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


@app.route('/')
def index():
    return send_from_directory('ui', 'index.html')


@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('ui', filename)


@app.route('/mcp', methods=['POST'])
def proxy_mcp():
    """Handle MCP tool calls"""
    try:
        data = request.get_json()
        print(f"→ Request: {data}")
        
        params = data.get('params', {})
        tool_name = params.get('name', 'query')
        arguments = params.get('arguments', {})
        
        # Call MCP tool
        result = run_async(call_mcp_tool(tool_name, arguments))
        
        # Extract text content
        if hasattr(result, 'content') and result.content:
            response_data = result.content[0].text if hasattr(result.content[0], 'text') else str(result.content[0])
        else:
            response_data = str(result)
        
        print(f"← Result: {response_data[:200]}...")
        
        return jsonify({
            "jsonrpc": "2.0",
            "id": data.get("id"),
            "result": response_data
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            "jsonrpc": "2.0", 
            "id": request.get_json().get("id") if request.get_json() else None,
            "error": {"code": -32000, "message": str(e)}
        }), 500


if __name__ == '__main__':
    print(f"🚀 STIX Q&A Server running at http://localhost:3000")
    print(f"   Connecting to MCP at {MCP_URL}\n")
    app.run(port=3000, debug=False)

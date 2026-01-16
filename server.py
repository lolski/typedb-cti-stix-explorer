#!/usr/bin/env python3
"""
STIX Q&A Server - REST API with LLM integration
"""

import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from fastmcp import Client
import asyncio
import httpx

from context import SYSTEM_PROMPT_GENERATE_QUERY, SYSTEM_PROMPT_FORMAT_ANSWER

app = Flask(__name__)
CORS(app)

# Configuration
MCP_URL = os.environ.get("MCP_URL", "http://localhost:8001/mcp")
CLAUDE_API_KEY = os.environ.get("CLAUDE_API_KEY", "")
CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-20250514")


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
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(asyncio.run, coro)
                return future.result()
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


async def call_claude(system_prompt: str, user_message: str) -> str:
    """Call Claude API with the given prompts"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "Content-Type": "application/json",
                "x-api-key": CLAUDE_API_KEY,
                "anthropic-version": "2023-06-01"
            },
            json={
                "model": CLAUDE_MODEL,
                "max_tokens": 1024,
                "system": system_prompt,
                "messages": [{"role": "user", "content": user_message}]
            },
            timeout=60.0
        )
        response.raise_for_status()
        data = response.json()
        return data.get("content", [{}])[0].get("text", "").strip()


def generate_typeql(question: str) -> str:
    """Generate TypeQL query from natural language question"""
    return run_async(call_claude(SYSTEM_PROMPT_GENERATE_QUERY, question))


def format_answer(question: str, results: str) -> str:
    """Format query results into human-readable answer"""
    if not results or results == "[]":
        return "No data found in the threat intelligence database for this query."
    
    user_message = f"Question: {question}\n\nQuery Results:\n{results}"
    return run_async(call_claude(SYSTEM_PROMPT_FORMAT_ANSWER, user_message))


def execute_query(typeql: str) -> str:
    """Execute TypeQL query via MCP"""
    result = run_async(call_mcp_tool("query", {
        "query": typeql,
        "database": "stix",
        "transaction_type": "read"
    }))
    
    # Extract text content from MCP response
    if hasattr(result, 'content') and result.content:
        return result.content[0].text if hasattr(result.content[0], 'text') else str(result.content[0])
    return str(result)


@app.route('/query', methods=['POST'])
def query():
    """
    Main endpoint for natural language queries.
    
    Request body:
        {"question": "What threat actors are in the database?"}
    
    Response:
        {
            "answer": "Human-readable answer...",
            "typeql_query": "match $ta isa threat-actor...",
            "raw_results": "..."
        }
    """
    try:
        data = request.get_json()
        question = data.get('question', '').strip()
        
        if not question:
            return jsonify({"error": "Missing 'question' field"}), 400
        
        if not CLAUDE_API_KEY:
            return jsonify({"error": "CLAUDE_API_KEY environment variable not set"}), 500
        
        print(f"→ Question: {question}")
        
        # Step 1: Generate TypeQL query
        typeql = generate_typeql(question)
        print(f"→ TypeQL: {typeql}")
        
        if typeql == "CANNOT_QUERY":
            return jsonify({
                "answer": "This question cannot be answered with the available threat intelligence data.",
                "typeql_query": None,
                "raw_results": None
            })
        
        # Step 2: Execute query via MCP
        raw_results = execute_query(typeql)
        print(f"→ Results: {raw_results[:200]}..." if len(raw_results) > 200 else f"→ Results: {raw_results}")
        
        # Step 3: Format answer
        answer = format_answer(question, raw_results)
        print(f"→ Answer: {answer[:200]}..." if len(answer) > 200 else f"→ Answer: {answer}")
        
        return jsonify({
            "answer": answer,
            "typeql_query": typeql,
            "raw_results": raw_results
        })
        
    except httpx.HTTPStatusError as e:
        error_body = e.response.text
        print(f"Claude API error: {error_body}")
        return jsonify({"error": f"Claude API error: {error_body}"}), 500
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok"})


if __name__ == '__main__':
    print(f"🚀 STIX Q&A Server running at http://localhost:3000")
    print(f"   MCP endpoint: {MCP_URL}")
    print(f"   Claude model: {CLAUDE_MODEL}")
    if not CLAUDE_API_KEY:
        print("   ⚠️  CLAUDE_API_KEY not set!")
    print()
    app.run(port=3000, debug=False)

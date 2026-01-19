# Guided Exploration of STIX with TypeDB, MCP, and Prompt-Guided Knowledge Graph Exploration

Threat intelligence data is powerful, but it is also famously difficult to explore. STIX datasets are large, highly connected, and semantically rich. Analysts and engineers often end up either writing brittle ad-hoc queries or exporting data into flat tools that lose most of the structure that makes STIX valuable.

In this tutorial, we will build a **Prompt-Guided Knowledge Graph Explorer** on top of a STIX datastore using **TypeDB** and the **TypeDB MCP Server**. By the end, you will have a working **REST API backend** where users can submit natural-language questions and receive grounded answers derived from a STIX knowledge graph.

This same pattern applies to *any* TypeDB knowledge graph.

---

## Why: Guided exploration of a STIX datastore

STIX represents cyber-threat intelligence as a graph: threat actors, campaigns, malware, indicators, vulnerabilities, infrastructure, and the relationships between them. The value lies not in individual objects, but in how they connect.

However, this richness creates friction:

* Analysts do not want to learn a query language.
* Developers do not want to build bespoke exploration tools.
* LLMs can understand questions, but need structure to safely interact with databases.

What we want instead is:

> A way to ask questions like
> *“What infrastructure is used by ransomware groups targeting healthcare?”*
> and get answers grounded in real STIX data.

This is exactly what **Prompt-Guided Knowledge Graph Exploration** enables.

---

## How the pieces fit together

We combine three components:

1. **TypeDB STIX** – a production-grade STIX knowledge graph
   [https://github.com/typedb-osi/typedb-cti](https://github.com/typedb-osi/typedb-cti)

2. **TypeDB MCP Server** – a controlled interface between LLMs and TypeDB
   [https://github.com/typedb/typedb-mcp](https://github.com/typedb/typedb-mcp)

3. **Prompt-Guided Explorer Backend** – a REST API for semantic graph exploration
   [https://github.com/lolski/typedb-cti-stix-explorer](https://github.com/lolski/typedb-cti-stix-explorer)

Together, these form a complete guided exploration stack.

---

## Step 1: Prerequisites — setting up TypeDB, STIX, and MCP

### 1.1 Start TypeDB

Install TypeDB Community Edition and start the server:

```bash
typedb server
```

This launches TypeDB on the default port (`8000`).

---

### 1.2 Load the STIX schema and data

Clone the TypeDB STIX repository:

```
https://github.com/typedb-osi/typedb-cti
```

Follow the repository instructions to:

* Create a database
* Load the STIX schema
* Import STIX data

When complete, your TypeDB instance will contain a fully populated STIX knowledge graph.

---

### 1.3 Start the TypeDB MCP Server

Start the MCP server using Docker:

```bash
docker run -p 8001:8001 typedb/typedb-mcp:1.0.0 \
  --typedb-address http://host.docker.internal:8000
```

This exposes the MCP interface on port `8001` and connects it to TypeDB.

---

## Step 2: Build the Prompt-Guided Explorer backend (REST API)

In this step, we create a **backend-only service** that accepts user questions and returns grounded answers derived from the STIX knowledge graph.

### 2.1 Create a backend server in Flask

Initialize a Flask application that will serve as your REST API backend:

```python
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

if __name__ == '__main__':
    app.run(port=3000)
```

This server is responsible for receiving user queries, orchestrating prompt guidance, and communicating with Claude and the MCP server.

---

### 2.2 Declare a REST endpoint for user queries

Define a REST endpoint (`POST /query`) that accepts a user's natural-language question:

```python
@app.route('/query', methods=['POST'])
def query():
    data = request.get_json()
    question = data.get('question', '').strip()
    
    if not question:
        return jsonify({"error": "Missing 'question' field"}), 400
    
    # Processing logic goes here...
    
    return jsonify({
        "answer": answer,
        "typeql_query": typeql,
        "raw_results": raw_results
    })
```

This endpoint is the only interface exposed to clients.

---

### 2.3 Create an MCP client

Configure an MCP client using FastMCP to connect to the TypeDB MCP Server:

```python
from fastmcp import Client
import asyncio

MCP_URL = "http://localhost:8001/mcp"

async def call_mcp_tool(tool_name: str, arguments: dict):
    """Call MCP tool using FastMCP client with HTTP transport"""
    async with Client(MCP_URL) as client:
        result = await client.call_tool(tool_name, arguments)
        return result

def execute_query(typeql: str) -> str:
    """Execute TypeQL query via MCP"""
    result = asyncio.run(call_mcp_tool("query", {
        "query": typeql,
        "database": "stix",
        "transaction_type": "read"
    }))
    return result.content[0].text
```

This client is the bridge between language reasoning and the knowledge graph.

---

### 2.4 Define the prompt guide

Create a prompt guide that teaches the model how to reason about STIX. This encodes schema knowledge and example queries:

```python
STIX_SCHEMA = """
## STIX 2.1 Schema for TypeDB

### Entity Types
- threat-actor: Threat actors with name, description, alias_
- campaign: Campaigns with name, description, first-seen, last-seen
- attack-pattern: Attack patterns (includes MITRE ATT&CK techniques)
- indicator: Indicators with name, pattern, valid-from
- malware: Malware with name, malware-type, is-family

### Relationship Types
- uses: (campaign|threat-actor) uses (attack-pattern|tool|malware)
- targets: (campaign|threat-actor) targets (identity|vulnerability)
- attributed-to: campaign attributed-to threat-actor
- indicates: indicator indicates (campaign|malware|threat-actor)
"""

STIX_EXAMPLES = """
### Find all threat actors:
match $ta isa threat-actor, has name $name;
fetch { "name": $name };

### Find attack patterns used by a campaign:
match
  $campaign isa campaign, has name $cname;
  $ap isa attack-pattern, has name $apname;
  uses ($campaign, $ap);
fetch { "campaign": $cname, "attack_pattern": $apname };
"""

SYSTEM_PROMPT_GENERATE_QUERY = f"""
You are a TypeQL query generator for a STIX 2.1 threat intelligence database.

{STIX_SCHEMA}

{STIX_EXAMPLES}

Given a user question, generate a valid TypeQL fetch query to answer it.
Respond with ONLY the TypeQL query, no markdown, no explanations.
"""
```

This prompt guide is the foundation of **prompt-guided reasoning**.

---

### 2.5 Declare the Claude client

Configure a Claude client using the Anthropic HTTP API:

```python
import httpx

CLAUDE_API_KEY = os.environ.get("CLAUDE_API_KEY")

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
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 1024,
                "system": system_prompt,
                "messages": [{"role": "user", "content": user_message}]
            }
        )
        data = response.json()
        return data["content"][0]["text"].strip()
```

Claude interprets user intent, generates TypeQL, and explains results.

---

### 2.6 Implement the REST endpoint logic

The complete endpoint orchestrates the full prompt-guided flow:

```python
@app.route('/query', methods=['POST'])
def query():
    data = request.get_json()
    question = data.get('question', '').strip()
    
    # Step 1: Generate TypeQL query using Claude + prompt guide
    typeql = asyncio.run(call_claude(SYSTEM_PROMPT_GENERATE_QUERY, question))
    
    # Step 2: Execute query via MCP
    raw_results = execute_query(typeql)
    
    # Step 3: Format answer using Claude
    answer = asyncio.run(call_claude(
        SYSTEM_PROMPT_FORMAT_ANSWER,
        f"Question: {question}\n\nQuery Results:\n{raw_results}"
    ))
    
    return jsonify({
        "answer": answer,
        "typeql_query": typeql,
        "raw_results": raw_results
    })
```

The flow:
1. **Accept user prompt** → Receive natural-language question
2. **Augment with prompt guide** → Combine with STIX schema/examples
3. **Send to Claude** → Generate TypeQL query
4. **Execute via MCP** → Query TypeDB
5. **Format with Claude** → Explain results in natural language
6. **Return answer** → Grounded, STIX-backed response

---

## Step 3: Use the explorer

Once the backend is running, usage is simple.

A client sends a request such as:

```bash
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "Which threat actors have used malware related to Log4Shell?"}'
```

The backend:

* Guides the model using the STIX prompt
* Queries the knowledge graph via MCP
* Returns an explanation grounded in real STIX data

No schema knowledge or query language is required by the user.

---

## Conclusion

We have built a **Prompt-Guided Knowledge Graph Explorer** as a REST API by combining:

* **TypeDB STIX** as a rich, structured threat-intelligence graph
* **TypeDB MCP Server** as a safe, LLM-aware query interface
* A prompt-guided backend that translates intent into graph exploration

This enables **guided exploration of a STIX datastore** through natural language—without embeddings, without vector search, and without building a UI.

More importantly, this pattern generalizes to any TypeDB knowledge graph. If your data is structured, connected, and meaningful, it is ready for Prompt-Guided Knowledge Graph Exploration.

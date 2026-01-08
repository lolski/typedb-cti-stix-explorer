# RAG with TypeDB MCP

## What is it about
    - show typedb, typedb-cti and typedb mcp
    - topic can be anything
    - prompt engineering for the rag
        - typedb 3 syntax
            - look at the 
    
    - schema queries
        - what data may be stored (helped with augmentation)
        - what data is actually stored (helped with augmentation)
    - basic queries:
        "List all attack patterns"
        "What indicators (IOCs) are tracked?"
        "What threat actors are in the database?"
        "What campaigns exist?"

    - relational queries:
        "show all threat actors and related campaigns"
        "show all campaigns and related attack patterns"
        "show all campaigns, related attack patterns and also related threat actors"
    - noop
        "What indicators are associated with the Salt Typhoon campaign?" - no
        "Who is behind the Salt Typhoon campaign?" - no

## Components
- user input (english) to TypeQL converter: LLM guided using prompt augmentation technique
- knowledge base: in TypeDB, accessible via TypeDB MCP Server

## Setup

```
# start TypeDB And load STIX
typedb server
typedb console --address localhost:1729 --username admin --password password --tls-disabled --script=schema/setup_script.tqls
.venv/bin/python3 src/main.py --tls-disabled ingest sample/salt_typhoon_stix.json

# start MCP server
podman run -p 8001:8001 typedb/typedb-mcp:1.0.0 --typedb-address http://host.docker.internal:8000

# start app
cd app/
.venv/bin/python3 server.py

# open app
go to http://localhost:3000/ in the browser
- paste the claude token
```
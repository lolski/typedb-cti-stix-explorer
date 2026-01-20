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
#!/usr/bin/env python3
"""
STIX Q&A Server - Flask-based with CORS proxy to TypeDB MCP
"""

from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__, static_folder='.')
CORS(app)

MCP_URL = "http://localhost:8001/mcp"


@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)


@app.route('/mcp', methods=['POST'])
def proxy_mcp():
    """Proxy requests to TypeDB MCP server"""
    try:
        response = requests.post(
            MCP_URL,
            json=request.get_json(),
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        return response.json(), response.status_code
    except requests.exceptions.ConnectionError:
        return jsonify({"error": {"message": f"Cannot connect to MCP at {MCP_URL}"}}), 502
    except Exception as e:
        return jsonify({"error": {"message": str(e)}}), 500


if __name__ == '__main__':
    print(f"🚀 STIX Q&A Server running at http://localhost:3000")
    print(f"   Proxying /mcp → {MCP_URL}\n")
    app.run(port=3000, debug=True)

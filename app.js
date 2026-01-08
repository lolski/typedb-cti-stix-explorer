import { SYSTEM_PROMPT_GENERATE_QUERY, SYSTEM_PROMPT_FORMAT_ANSWER } from './schema-context.js';

// DOM Elements
const apiKeyInput = document.getElementById('apiKey');
const mcpUrlInput = document.getElementById('mcpUrl');
const questionInput = document.getElementById('questionInput');
const askButton = document.getElementById('askButton');
const responseSection = document.getElementById('responseSection');
const answerContent = document.getElementById('answerContent');
const queryContent = document.getElementById('queryContent');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');

// Make handleQuery available globally
window.handleQuery = handleQuery;

/**
 * Main handler for user queries
 */
async function handleQuery() {
    const question = questionInput.value.trim();
    const apiKey = apiKeyInput.value.trim();
    const mcpUrl = mcpUrlInput.value.trim();

    // Validation
    if (!question) {
        showError('Please enter a question.');
        return;
    }
    if (!apiKey) {
        showError('Please enter your Claude API key in the configuration section.');
        document.getElementById('configSection').open = true;
        return;
    }

    // Reset UI
    hideError();
    hideResponse();
    setLoading(true);

    try {
        // Step 1: Generate TypeQL query
        console.log('Generating TypeQL query...');
        const typeql = await generateTypeQL(question, apiKey);

        if (typeql === 'CANNOT_QUERY') {
            showResponse(
                'This question cannot be answered with the available threat intelligence data.',
                '-- No query generated --'
            );
            return;
        }

        // Step 2: Execute query via MCP
        console.log('Executing query:', typeql);
        const results = await executeQuery(typeql, mcpUrl);
        console.log('Query results:', results);

        // Step 3: Format answer
        console.log('Formatting answer...');
        const answer = await formatAnswer(question, results, apiKey);

        // Step 4: Display results
        showResponse(answer, typeql);

    } catch (error) {
        console.error('Error:', error);
        showError(error.message || 'An unexpected error occurred.');
    } finally {
        setLoading(false);
    }
}

/**
 * Call Claude API to generate TypeQL from natural language
 */
async function generateTypeQL(question, apiKey) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: SYSTEM_PROMPT_GENERATE_QUERY,
            messages: [
                { role: 'user', content: question }
            ]
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`Claude API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text?.trim();

    if (!content) {
        throw new Error('No response from Claude API');
    }

    return content;
}

/**
 * Execute TypeQL query via TypeDB MCP
 */
async function executeQuery(typeql, mcpUrl) {
    // MCP uses JSON-RPC 2.0 format
    const rpcRequest = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
            name: 'query',
            arguments: {
                query: typeql
            }
        }
    };

    // Use local proxy (Flask server handles CORS and forwards to MCP)
    const response = await fetch('/mcp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(rpcRequest)
    });

    if (!response.ok) {
        throw new Error(`MCP error: ${response.statusText}`);
    }

    const data = await response.json();

    // Handle JSON-RPC error
    if (data.error) {
        throw new Error(`MCP query error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    // Extract result from JSON-RPC response
    return data.result || [];
}

/**
 * Call Claude API to format raw results into human-readable answer
 */
async function formatAnswer(question, results, apiKey) {
    const resultsStr = JSON.stringify(results, null, 2);

    // Handle empty results
    if (!results || (Array.isArray(results) && results.length === 0)) {
        return 'No data found in the threat intelligence database for this query.';
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: SYSTEM_PROMPT_FORMAT_ANSWER,
            messages: [
                {
                    role: 'user',
                    content: `Question: ${question}\n\nQuery Results:\n${resultsStr}`
                }
            ]
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`Claude API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text?.trim() || 'Unable to format response.';
}

// UI Helper Functions
function setLoading(loading) {
    askButton.disabled = loading;
    askButton.querySelector('.btn-text').hidden = loading;
    askButton.querySelector('.btn-loading').hidden = !loading;
}

function showResponse(answer, query) {
    answerContent.textContent = answer;
    queryContent.textContent = query;
    responseSection.hidden = false;
}

function hideResponse() {
    responseSection.hidden = true;
}

function showError(message) {
    errorMessage.textContent = message;
    errorSection.hidden = false;
}

function hideError() {
    errorSection.hidden = true;
}

// Enter key to submit
questionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleQuery();
    }
});

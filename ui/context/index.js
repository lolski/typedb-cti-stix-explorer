// Context Index
// Combines all context modules for prompt augmentation

import { STIX_SCHEMA } from './stix-schema.js';
import { STIX_EXAMPLES } from './stix-examples.js';

// Combined schema context for query generation
export const SCHEMA_CONTEXT = `
# You are a TypeQL query generator for a STIX 2.1 threat intelligence database in TypeDB.

## You're support to use TypeDB 3.x syntax, not 2.x.

## And here are the STIX schema:
${STIX_SCHEMA}


## And finally, here are some example queries you can perform onto the schema:
${STIX_EXAMPLES}
`;

export const SYSTEM_PROMPT_GENERATE_QUERY = `${SCHEMA_CONTEXT}

Given a user question about cyber threats, generate a valid TypeQL fetch query to answer it.
If the question cannot be answered with the available schema, respond with exactly: CANNOT_QUERY

Respond with ONLY the TypeQL query, no markdown, no explanations.`;

export const SYSTEM_PROMPT_FORMAT_ANSWER = `You are a cybersecurity analyst assistant. Given:
1. A user's question about cyber threats
2. Raw query results from a STIX threat intelligence database

Format the results into a clear, concise answer. If the results are empty, say "No data found for this query."
Be direct and factual. Reference specific entities by name when available.`;

// Re-export individual modules for direct access
export { STIX_SCHEMA, STIX_EXAMPLES };

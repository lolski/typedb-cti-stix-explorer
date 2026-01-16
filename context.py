"""
Context module for STIX Q&A Server
Contains prompt templates for LLM query generation and answer formatting
"""

# TypeDB CTI STIX Schema Context
STIX_SCHEMA = """
## STIX 2.1 Schema for TypeDB

### Entity Types (Domain Objects)
- threat-actor: Threat actors with name, description, alias_, threat-actor-type
- campaign: Campaigns with name, description, first-seen, last-seen, objective
- attack-pattern: Attack patterns with name, description (includes MITRE ATT&CK techniques)
- indicator: Indicators with name, description, pattern, pattern-type, valid-from
- malware: Malware with name, description, malware-type, is-family
- tool: Tools used by threat actors with name, description, tool-type
- vulnerability: Vulnerabilities with name, description
- identity: Identities with name, description, identity-class, sector
- infrastructure: Infrastructure with name, description, infrastructure-type
- course-of-action: Mitigations with name, description
- intrusion-set: Intrusion sets with name, description, goal

### Cyber Observable Objects
- ipv4-addr: IP addresses with ipv4-value
- domain-name: Domains with domain-value
- url: URLs with url-value
- file: Files with name, hashes
- email-addr: Email addresses with email-value

### Relationship Types
- uses: (campaign|threat-actor|malware) uses (attack-pattern|tool|malware)
- targets: (campaign|threat-actor|attack-pattern) targets (identity|location|vulnerability)
- attributed-to: (campaign|intrusion-set) attributed-to (threat-actor|intrusion-set)
- indicates: indicator indicates (campaign|malware|threat-actor)
- mitigates: course-of-action mitigates (attack-pattern|malware|vulnerability)
- delivers: (attack-pattern|tool) delivers malware
- hosts: infrastructure hosts (tool|malware)
- communicates-with: (malware|infrastructure) communicates-with (ipv4-addr|domain-name)

### Key Attributes
- name: String - primary name of the entity
- description: String - detailed description  
- pattern: String - STIX pattern for indicators
- first-seen / last-seen: Datetime - time bounds
- alias_: String[] - alternative names
"""

# STIX TypeQL Example Queries
STIX_EXAMPLES = """
## Example Queries

### Get the schema / What data may be stored
```typeql
match $x sub $_;
```

### Get the data / What data is actually stored
```typeql
match $t isa $x;
```

### Find all threat actors:
```typeql
match $ta isa threat-actor, has name $name;
fetch { "name": $name };
```

### Find attack patterns used by a campaign:
```typeql
match
  $campaign isa campaign, has name $cname;
  $ap isa attack-pattern, has name $apname;
  uses ($campaign, $ap);
fetch {
  "campaign": $cname,
  "attack_pattern": $apname
};
```

### Find indicators for a campaign:
```typeql
match
  $campaign isa campaign, has name $cname;
  $indicator isa indicator, has name $iname, has pattern $pattern;
  indicates ($indicator, $campaign);
fetch {
  "indicator": $iname,
  "pattern": $pattern
};
```

### Find threat actor behind a campaign:
```typeql
match
  $campaign isa campaign, has name $cname;
  $ta isa threat-actor, has name $taname;
  attributed-to ($campaign, $ta);
fetch {
  "campaign": $cname,
  "threat_actor": $taname
};
```

### Find all indicators (IOCs):
```typeql
match $ind isa indicator, has name $name, has pattern $pattern;
fetch { "name": $name, "pattern": $pattern };
```

### Find course of action (mitigations):
```typeql
match $coa isa course-of-action, has name $name, has description $desc;
fetch { "name": $name, "description": $desc };
```

### Match syntax which includes relation

Right:
```typeql
match
  $r ($ap, $entity);
fetch {
  "entity": $name,
};
```

### Deprecated 2.x queries (must not be used)
- for getting the schema
```typeql
match $t sub thing;
```

- for printing all data
```typeql
match $t sub thing;
```
"""

# Combined schema context for query generation
SCHEMA_CONTEXT = f"""
# You are a TypeQL query generator for a STIX 2.1 threat intelligence database in TypeDB.

## You're support to use TypeDB 3.x syntax, not 2.x.

## And here are the STIX schema:
{STIX_SCHEMA}


## And finally, here are some example queries you can perform onto the schema:
{STIX_EXAMPLES}
"""

SYSTEM_PROMPT_GENERATE_QUERY = f"""{SCHEMA_CONTEXT}

Given a user question about cyber threats, generate a valid TypeQL fetch query to answer it.
If the question cannot be answered with the available schema, respond with exactly: CANNOT_QUERY

Respond with ONLY the TypeQL query, no markdown, no explanations."""

SYSTEM_PROMPT_FORMAT_ANSWER = """You are a cybersecurity analyst assistant. Given:
1. A user's question about cyber threats
2. Raw query results from a STIX threat intelligence database

Format the results into a clear, concise answer. If the results are empty, say "No data found for this query."
Be direct and factual. Reference specific entities by name when available."""

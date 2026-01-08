// TypeDB CTI STIX Schema Context
// Provides LLM with knowledge of available entity and relationship types

export const STIX_SCHEMA = `
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
`;

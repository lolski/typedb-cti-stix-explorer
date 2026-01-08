// STIX TypeQL Example Queries
// Few-shot examples to guide LLM query generation

export const STIX_EXAMPLES = `
## Example Queries

### Find all threat actors:
\`\`\`typeql
match $ta isa threat-actor, has name $name;
fetch { "name": $name };
\`\`\`

### Find attack patterns used by a campaign:
\`\`\`typeql
match
  $campaign isa campaign, has name $cname;
  $ap isa attack-pattern, has name $apname;
  uses ($campaign, $ap);
fetch {
  "campaign": $cname,
  "attack_pattern": $apname
};
\`\`\`

### Find indicators for a campaign:
\`\`\`typeql
match
  $campaign isa campaign, has name $cname;
  $indicator isa indicator, has name $iname, has pattern $pattern;
  indicates ($indicator, $campaign);
fetch {
  "indicator": $iname,
  "pattern": $pattern
};
\`\`\`

### Find threat actor behind a campaign:
\`\`\`typeql
match
  $campaign isa campaign, has name $cname;
  $ta isa threat-actor, has name $taname;
  attributed-to ($campaign, $ta);
fetch {
  "campaign": $cname,
  "threat_actor": $taname
};
\`\`\`

### Find all indicators (IOCs):
\`\`\`typeql
match $ind isa indicator, has name $name, has pattern $pattern;
fetch { "name": $name, "pattern": $pattern };
\`\`\`

### Find course of action (mitigations):
\`\`\`typeql
match $coa isa course-of-action, has name $name, has description $desc;
fetch { "name": $name, "description": $desc };
\`\`\`
`;

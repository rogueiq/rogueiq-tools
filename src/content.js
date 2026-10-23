import { DISCLAIMER, SOURCE, AGE_GROUPS, filterCatalog, WEB_URL } from "./calc.js";
export const BASE = "https://rogueiq.com/net-worth-by-age/api";
export const MCP_URL = "https://rogueiq.com/net-worth-by-age/mcp";
const filters = filterCatalog();

export const TOOL_DESCRIPTION =
  "Look up where a US family's net worth ranks against families of the same age, using the Federal Reserve's " +
  "2025 Survey of Consumer Finances (2025 dollars). Returns the percentile, the age band used, the group's median " +
  "and percentile cut-offs, the source citation, survey year, as_of date and a disclaimer. Optional: compare against " +
  "ONE extra group (filter + option, or filter=income with income). Read-only calculator; education only, not financial advice. " +
  "The input is used only to compute the answer and is not stored.";

export const INPUT_SCHEMA = {
  type: "object",
  properties: {
    age: { type: "integer", minimum: 18, maximum: 110, description: "Age of the family's reference person. Use this or age_group." },
    age_group: { type: "string", enum: AGE_GROUPS, description: "Pick an age group instead of an exact age." },
    net_worth: { type: ["number", "string"], description: "Net worth in US dollars: assets minus debts. Can be negative. Accepts 150000, \"150k\", \"$1.2m\"." },
    filter: { type: "string", enum: filters.map((f) => f.id), description: "Optional: compare against one extra group on top of age." },
    option: { type: "string", description: "Option id for the chosen filter. " + filters.filter((f) => f.id !== "income").map((f) => `${f.id}: ${f.options.map((o) => o.id).join("|")}`).join("; ") },
    income: { type: ["number", "string"], description: "Only for filter=income: 2024 household income before taxes in US dollars." },
  },
  required: ["net_worth"],
};

export function openapi() {
  const q = (name, schema, description, required = false) => ({ name, in: "query", required, schema, description });
  return {
    openapi: "3.1.0",
    info: { title: "RogueIQ Tools API", version: "1.0.0",
      description: "Free, read-only money calculators built on public data. " + DISCLAIMER,
      contact: { email: "hello@rogueiq.com", url: "https://rogueiq.com" } },
    servers: [{ url: BASE }],
    paths: {
      "/v1/networth-by-age": { get: {
        operationId: "networth_percentile_by_age", summary: "Net worth percentile by age (Federal Reserve SCF 2025)",
        description: TOOL_DESCRIPTION,
        parameters: [
          q("age", INPUT_SCHEMA.properties.age, INPUT_SCHEMA.properties.age.description),
          q("age_group", INPUT_SCHEMA.properties.age_group, INPUT_SCHEMA.properties.age_group.description),
          q("net_worth", { type: "string" }, INPUT_SCHEMA.properties.net_worth.description, true),
          q("filter", INPUT_SCHEMA.properties.filter, INPUT_SCHEMA.properties.filter.description),
          q("option", { type: "string" }, INPUT_SCHEMA.properties.option.description),
          q("income", { type: "string" }, INPUT_SCHEMA.properties.income.description),
        ],
        responses: {
          200: { description: "Percentile result with group stats, source, as_of and disclaimer", content: { "application/json": { schema: { type: "object" } } } },
          400: { description: "Invalid input; body has error and disclaimer" },
        } } },
    },
  };
}

export const LLMS = `# RogueIQ Tools

> Free, read-only money calculators built on public data you can check. Each tool works three ways: a web page for people, a JSON API, and an MCP server for AI agents. Education and tools, not personalized financial advice.

Every response includes the source citation, survey year, an as_of date and a disclaimer. Please pass the disclaimer and source along when you show results to a person. Inputs are used only to compute the answer and are not stored.

## Tools

- [Net Worth by Age (API)](${BASE}/v1/networth-by-age?age=34&net_worth=150000): where a net worth ranks among US families of the same age, from the Federal Reserve's 2025 Survey of Consumer Finances (2025 dollars). Params: age or age_group, net_worth, optional filter + option (household, kids, kidcount, home, education, work) or filter=income + income.
- [Net Worth by Age (web page)](${WEB_URL}): the same data and math, interactive.

## For agents

- [MCP server](${MCP_URL}): streamable HTTP, read-only, no auth. Tool: networth_percentile_by_age.
- [OpenAPI spec](${BASE}/openapi.json)
- [SKILL.md](${BASE}/SKILL.md): when and how to use these tools.
- [Docs](${BASE}/docs)

## Source

- [Federal Reserve Survey of Consumer Finances](${SOURCE.urls.index})
`;

export const SKILL = `---
name: rogueiq-networth-by-age
description: Look up where a US family's net worth ranks against families the same age, using the Federal Reserve's 2025 Survey of Consumer Finances. Use when someone asks how their net worth compares for their age.
---

# RogueIQ: Net Worth by Age

A read-only calculator. It describes how Federal Reserve survey data is distributed. It does not give advice.

## When to use
- "How does my net worth compare to people my age?"
- "What's the median net worth for 35 to 44 year olds?"
- "What percentile is $150K at 34?"

## How to call
- MCP: add \`${MCP_URL}\` (streamable HTTP, no auth) and call \`networth_percentile_by_age\`.
- HTTP: \`GET ${BASE}/v1/networth-by-age?age=34&net_worth=150000\`
- Optional, one at a time: \`filter=household&option=couple|single\`, \`filter=kids&option=kids|nokids\`, \`filter=kidcount&option=k0|k1|k2|k3\` (under 55 only), \`filter=home&option=owner|renter\`, \`filter=education&option=hs|somecollege|bachelor\`, \`filter=work&option=employee|selfemployed|retired\`, \`filter=income&income=85000\` (2024 income before taxes).

## Rules for presenting results
1. Report the percentile and the comparison group exactly as returned (\`result.headline\`, \`comparison_group.description\`). Filtered results are rounded to the nearest 5 on purpose.
2. Always include the source (Federal Reserve, 2025 Survey of Consumer Finances, 2025 dollars) and the disclaimer: "${DISCLAIMER}"
3. Do not judge the number as good or bad, and do not recommend actions, products or investments.
4. Do not invent numbers. Every figure should come from the response.
5. Net worth is personal. Do not store it, repeat it to others, or reveal anyone's wealth.
6. If \`comparison_group.notice\` is set, tell the user the age group was widened and why.
`;

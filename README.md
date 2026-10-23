# RogueIQ Tools (API + MCP)

Free, read-only RogueIQ money calculators for AI agents and developers, on a Cloudflare Worker (Hono, free plan).

- Docs: https://rogueiq.com/agents/
- API: `GET https://rogueiq.com/networth-by-age/api/v1/networth-by-age?age=34&net_worth=150000`
- MCP (streamable HTTP, no auth): `https://rogueiq.com/networth-by-age/mcp`, tool `networth_percentile_by_age`
- `/openapi.json`, `/llms.txt`, `/SKILL.md`

## Same data and math as the web checker
`src/data.js` is generated from [`rogueiq/networth-by-age`](https://github.com/rogueiq/networth-by-age)'s `data.js` (`npm run sync-data`).
`src/calc.js` mirrors `app.js` rule for rule. `test/parity.mjs` fills the real page in a browser and checks that the API gives the same headline, detail, median and notice.

## Commands
- `npm test`: unit tests (API, discovery files, MCP)
- `node test/parity.mjs [pageUrl] [apiBase]`: page vs. API parity
- `npm run deploy`: deploy with wrangler

Education and tools, not personalized financial advice. Source: Federal Reserve, 2025 Survey of Consumer Finances. Inputs are not stored.

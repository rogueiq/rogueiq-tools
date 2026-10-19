import { BASE } from "./content.js";
import { DISCLAIMER, WEB_URL, filterCatalog } from "./calc.js";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export function docsPage() {
  const mcpJson = JSON.stringify({ mcpServers: { rogueiq: { url: `${BASE}/mcp` } } }, null, 2);
  const filters = filterCatalog().map((f) => `<tr><td><code>${f.id}</code></td><td>${esc(f.label)}</td><td>${
    f.id === "income" ? "<code>income=85000</code> (2024, before taxes)" : f.options.map((o) => `<code>${o.id}</code>`).join(" ")}</td></tr>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>RogueIQ Tools API and MCP docs</title>
<meta name="description" content="Free, read-only RogueIQ money calculators as a JSON API and MCP server for AI agents. Net Worth by Age, from the Federal Reserve's 2025 Survey of Consumer Finances.">
<link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt">
<style>
:root{--brand:#22E6D0;--brand-deep:#0EA5A4;--ink:#07090A;--ember:#FF7A1A;--bg:#07090A;--surface:#0d1012;--line:#1f2326;--text:#F5EFE6;--muted:#9A948C;--code:#050607}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.6 system-ui,-apple-system,Segoe UI,Inter,sans-serif}
main{max-width:860px;margin:0 auto;padding:28px 18px 60px}a{color:var(--brand)}
.eyebrow{color:var(--muted);font-size:13px;letter-spacing:.08em;text-transform:uppercase;margin:0}
h1{font-size:clamp(28px,6vw,40px);line-height:1.15;margin:.3em 0;background:linear-gradient(90deg,var(--text) 40%,var(--brand-deep) 70%,var(--brand));-webkit-background-clip:text;background-clip:text;color:transparent}
h2{margin-top:2em;font-size:22px}.card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:18px;margin:16px 0}
pre{background:var(--code);border:1px solid var(--line);border-radius:10px;padding:14px;overflow:auto;font-size:13.5px;line-height:1.5}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.92em}td code,p code,li code{background:var(--code);padding:1px 5px;border-radius:5px}
table{width:100%;border-collapse:collapse;font-size:14.5px}td,th{border-bottom:1px solid var(--line);padding:8px 6px;text-align:left;vertical-align:top}
.btns{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0}.btn{display:inline-block;padding:10px 16px;border-radius:999px;background:var(--brand);color:var(--ink);text-decoration:none;font-weight:600}
.btn.ghost{background:transparent;border:1px solid var(--line);color:var(--text)}.muted{color:var(--muted)}.disc{font-size:14px;color:var(--muted);border-top:1px solid var(--line);margin-top:40px;padding-top:16px}
</style></head><body><main>
<p class="eyebrow"><span style="color:var(--text);font-weight:700;letter-spacing:0;text-transform:none">Rogue<span style="color:var(--brand)">IQ</span></span> Tools · for AI agents</p>
<h1>Built for your agent.</h1>
<p>Every RogueIQ tool is available as an API and MCP server, so your assistant can run the numbers, cite the source, and keep you current. Free, read-only, no sign-up.</p>
<div class="btns"><a class="btn" href="#mcp">Add the MCP server</a><a class="btn ghost" href="#api">API reference</a><a class="btn ghost" href="/openapi.json">openapi.json</a><a class="btn ghost" href="/llms.txt">llms.txt</a><a class="btn ghost" href="/SKILL.md">SKILL.md</a></div>

<h2 id="mcp">Add the MCP server</h2>
<p>Streamable HTTP, no auth. One tool: <code>networth_percentile_by_age</code>.</p>
<div class="card"><p class="muted" style="margin-top:0">Server URL</p><pre><code>${BASE}/mcp</code></pre>
<p class="muted">Claude Code</p><pre><code>claude mcp add --transport http rogueiq ${BASE}/mcp</code></pre>
<p class="muted">Cursor, Claude Desktop and other clients (mcp.json)</p><pre><code>${esc(mcpJson)}</code></pre></div>

<h2 id="api">Net Worth by Age</h2>
<p>Where a net worth ranks among US families of the same age, from the Federal Reserve's 2025 Survey of Consumer Finances (2025 dollars). Same data and math as the <a href="${WEB_URL}">web checker</a>.</p>
<pre><code>GET ${BASE}/v1/networth-by-age?age=34&amp;net_worth=150000</code></pre>
<table><tr><th>Param</th><th>What it is</th></tr>
<tr><td><code>age</code></td><td>18 to 110. Or use <code>age_group</code>: under35, 35-44, 45-54, 55-64, 65-74, 75plus.</td></tr>
<tr><td><code>net_worth</code></td><td>Required. Assets minus debts, US$. Can be negative. Accepts 150000, 150k, $1.2m.</td></tr>
<tr><td><code>filter</code> + <code>option</code></td><td>Optional. Compare against one extra group (below).</td></tr></table>
<h3>Filters (one at a time)</h3>
<table><tr><th>filter</th><th>Group</th><th>option</th></tr>${filters}</table>
<p class="muted">Filtered results are rounded to the nearest 5. If a group has fewer than 100 survey families, the age band widens and <code>comparison_group.notice</code> explains why.</p>
<h3>Response (trimmed)</h3>
<pre><code>{
  "result": { "percentile": 75, "headline": "Higher than about 75% of families", ... },
  "comparison_group": { "age_band": { "id": "under35", ... }, "description": "US families under 35" },
  "group_stats": { "median": 32820, "mean": ..., "percentiles": { "p10": ..., "p50": 32820, ... } },
  "source": { "publisher": "Board of Governors of the Federal Reserve System", ... },
  "survey_year": 2025, "as_of": "2026-10-09", "disclaimer": "For education only. ..."
}</code></pre>
<p><a href="${BASE}/v1/networth-by-age?age=34&amp;net_worth=150000">Try it live</a></p>

<h2>Privacy</h2><p>Inputs are used only to compute the answer. Nothing is stored or logged by the tool.</p>
<p class="disc">${esc(DISCLAIMER)} Source: Board of Governors of the Federal Reserve System, <a href="https://www.federalreserve.gov/econres/scfindex.htm">2025 Survey of Consumer Finances</a>. <a href="https://rogueiq.com">rogueiq.com</a></p>
</main></body></html>`;
}

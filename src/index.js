import { Hono } from "hono";
import { cors } from "hono/cors";
import { networthPercentile, InputError, DISCLAIMER } from "./calc.js";
import { openapi, LLMS, SKILL, TOOL_DESCRIPTION, INPUT_SCHEMA } from "./content.js";
import { docsPage } from "./docs.js";

const app = new Hono();
const NEW = "https://rogueiq.com/net-worth-by-age";
// Old workers.dev host: API + MCP keep answering directly (agents often don't follow POST redirects); everything else 301s to rogueiq.com.
app.use("*", async (c, next) => {
  const u = new URL(c.req.url);
  if (!u.hostname.endsWith(".workers.dev")) return next();
  if (u.pathname.startsWith("/v1/") || (u.pathname === "/mcp" && c.req.method !== "GET") || c.req.method === "OPTIONS") return next();
  const dest = u.pathname === "/mcp" ? `${NEW}/mcp` : u.pathname === "/" ? `${NEW}/api/docs` : `${NEW}/api${u.pathname}`;
  return c.redirect(dest + u.search, 301);
});
app.use("*", cors({ origin: "*", allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Accept", "Mcp-Session-Id", "Mcp-Protocol-Version"], exposeHeaders: ["Mcp-Session-Id"] }));
app.use("*", async (c, next) => { await next(); const p = new URL(c.req.url).pathname; c.header("X-Robots-Tag", p === "/mcp" || p.startsWith("/v1") || p === "/openapi.json" ? "noindex" : "index, follow"); });

app.get("/", (c) => c.redirect(`${NEW}/api/docs`, 302));
app.get("/health", (c) => c.json({ ok: true }));
app.get("/docs", (c) => c.html(docsPage()));
app.get("/openapi.json", (c) => c.json(openapi()));
app.get("/llms.txt", (c) => c.text(LLMS, 200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" }));
app.get("/SKILL.md", (c) => c.text(SKILL, 200, { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, max-age=3600" }));

app.get("/v1/networth-by-age", (c) => {
  try {
    const q = c.req.query();
    const out = networthPercentile(q);
    return c.json(out, 200, { "Cache-Control": "no-store" });
  } catch (e) {
    if (e instanceof InputError) return c.json({ error: e.message, disclaimer: DISCLAIMER }, 400);
    throw e;
  }
});

// ---------- Remote MCP (streamable HTTP, stateless, read-only, no auth) ----------
const SERVER_INFO = { name: "rogueiq-tools", version: "1.0.0" };
const TOOLS = [{
  name: "networth_percentile_by_age", title: "Net worth percentile by age (Fed SCF 2025)",
  description: TOOL_DESCRIPTION, inputSchema: INPUT_SCHEMA,
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
}];
const SUPPORTED = ["2025-06-18", "2025-03-26", "2024-11-05"];

function rpc(msg) {
  const { id, method, params } = msg || {};
  const ok = (result) => ({ jsonrpc: "2.0", id, result });
  const err = (code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
  if (!msg || msg.jsonrpc !== "2.0" || typeof method !== "string") return err(-32600, "Invalid Request");
  if (id === undefined) return null; // notification
  switch (method) {
    case "initialize": {
      const v = SUPPORTED.includes(params?.protocolVersion) ? params.protocolVersion : SUPPORTED[0];
      return ok({ protocolVersion: v, capabilities: { tools: { listChanged: false } }, serverInfo: SERVER_INFO,
        instructions: "Read-only calculators from RogueIQ. Always pass along the source and disclaimer. " + DISCLAIMER });
    }
    case "ping": return ok({});
    case "tools/list": return ok({ tools: TOOLS });
    case "tools/call": {
      if (params?.name !== "networth_percentile_by_age") return err(-32602, `Unknown tool: ${params?.name}`);
      try {
        const out = networthPercentile(params.arguments || {});
        const text = `${out.result.headline}. ${out.result.detail}` +
          (out.comparison_group.notice ? ` ${out.comparison_group.notice}` : "") +
          ` Median for this group: $${Math.round(out.group_stats.median).toLocaleString("en-US")}. ` +
          `Source: ${out.source.publisher}, ${out.source.survey} (2025 dollars). ${out.disclaimer}`;
        return ok({ content: [{ type: "text", text }], structuredContent: out, isError: false });
      } catch (e) {
        if (e instanceof InputError) return ok({ content: [{ type: "text", text: e.message }], isError: true });
        throw e;
      }
    }
    default: return err(-32601, `Method not found: ${method}`);
  }
}

app.post("/mcp", async (c) => {
  let body;
  try { body = await c.req.json(); } catch { return c.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400); }
  const batch = Array.isArray(body);
  const replies = (batch ? body : [body]).map(rpc).filter(Boolean);
  if (replies.length === 0) return c.body(null, 202);
  return c.json(batch ? replies : replies[0]);
});
app.get("/mcp", (c) => c.text("This MCP server is stateless and does not offer an SSE stream. POST JSON-RPC to /mcp.", 405, { Allow: "POST" }));
app.delete("/mcp", (c) => c.body(null, 405));

app.notFound((c) => c.json({ error: "Not found. See /docs", docs: "/docs" }, 404));
export default app;

import { describe, it, expect } from "vitest";
import app from "../src/index.js";
const get = async (p) => { const r = await app.request(p); return { status: r.status, body: await r.json() }; };
const mcp = async (body) => { const r = await app.request("/mcp", { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, body: JSON.stringify(body) }); return { status: r.status, body: r.status === 202 ? null : await r.json() }; };

describe("GET /v1/networth-by-age", () => {
  it("age 34 with $150K is about the 75th percentile", async () => {
    const { status, body } = await get("/v1/networth-by-age?age=34&net_worth=150000");
    expect(status).toBe(200);
    expect(body.result.percentile).toBe(75);
    expect(body.result.headline).toBe("Higher than about 75% of families");
    expect(body.comparison_group.age_band.id).toBe("under35");
    expect(body.group_stats.median).toBe(32820);
    expect(body.survey_year).toBe(2025);
    expect(body.as_of).toBe("2026-10-09");
    expect(body.disclaimer).toMatch(/not financial advice/i);
    expect(body.source.publisher).toMatch(/Federal Reserve/);
  });
  it("accepts 150k and age_group", async () => {
    const { body } = await get("/v1/networth-by-age?age_group=under35&net_worth=150k");
    expect(body.result.percentile).toBe(75);
  });
  it("handles negative and top values", async () => {
    expect((await get("/v1/networth-by-age?age=40&net_worth=-1000000")).body.result.position).toBe("below_1st");
    expect((await get("/v1/networth-by-age?age=40&net_worth=1000000000")).body.result.headline).toBe("Top 1%");
  });
  it("filters round to nearest 5 and widen thin groups", async () => {
    const { body } = await get("/v1/networth-by-age?age=70&net_worth=200000&filter=home&option=renter");
    expect(body.result.percentile % 5).toBe(0);
    expect(body.comparison_group.age_band.id).toBe("65plus");
    expect(body.comparison_group.notice).toMatch(/combined/);
    expect(body.group_stats.mean).toBeNull();
  });
  it("income filter maps income to a group", async () => {
    const { body } = await get("/v1/networth-by-age?age=40&net_worth=250k&filter=income&income=85000");
    expect(body.comparison_group.filter.option).toBe("inc3");
  });
  it("rejects bad input with a disclaimer", async () => {
    for (const q of ["age=17&net_worth=1", "age=30", "age=30&net_worth=abc", "age=30&net_worth=1&filter=nope", "age=60&net_worth=1&filter=kidcount&option=k1", "age=30&net_worth=1&filter=work&option=retired"]) {
      const { status, body } = await get("/v1/networth-by-age?" + q);
      expect(status, q).toBe(400);
      expect(body.disclaimer).toBeTruthy();
    }
  });
});

describe("discovery files", () => {
  it("serves openapi, llms.txt, SKILL.md, docs", async () => {
    expect((await get("/openapi.json")).body.paths["/v1/networth-by-age"]).toBeTruthy();
    for (const [p, re] of [["/llms.txt", /\/mcp/], ["/SKILL.md", /not financial advice/i], ["/docs", /Add the MCP server/]]) {
      const r = await app.request(p); expect(r.status).toBe(200); expect(await r.text()).toMatch(re);
    }
  });
});

describe("MCP", () => {
  it("initialize, list, call", async () => {
    const init = await mcp({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } } });
    expect(init.body.result.protocolVersion).toBe("2025-06-18");
    expect((await mcp({ jsonrpc: "2.0", method: "notifications/initialized" })).status).toBe(202);
    const list = await mcp({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    expect(list.body.result.tools[0].name).toBe("networth_percentile_by_age");
    expect(list.body.result.tools[0].annotations.readOnlyHint).toBe(true);
    const call = await mcp({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "networth_percentile_by_age", arguments: { age: 34, net_worth: 150000 } } });
    expect(call.body.result.structuredContent.result.percentile).toBe(75);
    expect(call.body.result.content[0].text).toMatch(/75%.*Federal Reserve.*not financial advice/is);
    const bad = await mcp({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "networth_percentile_by_age", arguments: { age: 10, net_worth: 1 } } });
    expect(bad.body.result.isError).toBe(true);
  });
});

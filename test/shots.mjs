import { chromium } from "playwright";
const S = "/workspace/rogueiq-site/screenshots/";
const b = await chromium.launch(); let errs = [];
async function run(url, vp, file, fn, full = true) {
  const p = await b.newPage({ viewport: vp, deviceScaleFactor: 2 });
  p.on("console", (m) => m.type() === "error" && errs.push(`${url} ${m.text()}`)); p.on("pageerror", (e) => errs.push(`${url} ${e}`));
  await p.goto(url, { waitUntil: "networkidle" }); if (fn) await fn(p);
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } window.scrollTo(0, 0); });
  await p.waitForLoadState("networkidle"); await p.waitForTimeout(300);
  await p.screenshot({ path: S + file, fullPage: full }); await p.close();
}
const fill = async (p) => { await p.fill("#mini-check [name=age]", "34"); await p.fill("#mini-check [name=nw]", "150k"); await p.click("#mini-check button");
  console.log("mini:", await p.textContent(".mr-head"), "|", await p.textContent(".mr-median")); };
const H = "http://localhost:8766/";
await run(H, { width: 390, height: 844 }, "home-v4-mobile.png", fill);
await run(H, { width: 390, height: 844 }, "home-v4-mobile-top.png", null, false);
await run(H, { width: 1280, height: 900 }, "home-v4-desktop.png", fill);
await run(H + "charts/", { width: 390, height: 844 }, "charts-v4-mobile.png");
await run("https://rogueiq-tools.rogueiq.workers.dev/docs", { width: 1280, height: 900 }, "agent-docs.png");
await run("https://rogueiq-tools.rogueiq.workers.dev/docs", { width: 390, height: 844 }, "agent-docs-mobile.png");
console.log("console errors:", errs.length, errs.join("\n")); await b.close();

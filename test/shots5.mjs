import { chromium } from "playwright";
const S = "/workspace/rogueiq-site/screenshots/"; const b = await chromium.launch(); const errs = [];
const set = (p, sel, v) => p.$eval(sel, (el, v) => { el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); }, v);
async function run(url, vp, file, fn) {
  const p = await b.newPage({ viewport: vp, deviceScaleFactor: 2 });
  p.on("console", (m) => m.type() === "error" && errs.push(`${file} ${m.text()}`)); p.on("pageerror", (e) => errs.push(`${file} ${e}`));
  await p.goto(url, { waitUntil: "networkidle" });
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); });
  if (fn) await fn(p); await p.waitForTimeout(400);
  await p.screenshot({ path: S + file, fullPage: true }); await p.close();
}
const M = { width: 390, height: 844 }, D = { width: 1280, height: 900 };
const checker = async (p) => { await set(p, "#age-slider", "34"); await p.fill("#networth", "150000"); await p.$eval("#networth", e => e.dispatchEvent(new Event("input", { bubbles: true })));
  console.log("live checker:", await p.textContent("#result-headline"), await p.textContent("#networth-out")); };
const mini = async (p) => { await set(p, "#mini-check [name=age_s]", "34"); await p.fill("#mini-check [name=nw]", "150000");
  console.log("mini:", await p.textContent(".mr-head"), await p.textContent('[data-for="nw"]')); };
await run("https://rogueiq.github.io/networth-by-age/", M, "checker-sliders-mobile.png", checker);
await run("https://rogueiq.github.io/networth-by-age/", D, "checker-sliders-desktop.png", checker);
await run("http://localhost:8766/", M, "home-v5-mobile.png", mini);
await run("http://localhost:8766/", D, "home-v5-desktop.png", mini);
await run("http://localhost:8766/charts/", M, "charts-v5-mobile.png");
await run("http://localhost:8766/charts/", D, "charts-v5-desktop.png");
console.log("console errors:", errs.length, errs.join("\n")); await b.close();

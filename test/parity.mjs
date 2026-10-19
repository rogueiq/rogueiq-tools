// Parity check: fill the real web checker in a browser and compare its answer with the live API.
// Usage: node test/parity.mjs [pageUrl] [apiBase]
import { chromium } from "playwright";
const PAGE = process.argv[2] || "https://rogueiq.github.io/networth-by-age/";
const API = process.argv[3] || "https://rogueiq-tools.rogueiq.workers.dev";
const cases = [
  { age: 34, net_worth: "150000" }, { age: 25, net_worth: "5000" }, { age: 40, net_worth: "-20000" },
  { age: 52, net_worth: "1.2m" }, { age: 60, net_worth: "411340" }, { age: 80, net_worth: "50000000" },
  { age: 34, net_worth: "150000", filter: "household", option: "couple" },
  { age: 38, net_worth: "90k", filter: "kids", option: "kids" },
  { age: 30, net_worth: "60000", filter: "kidcount", option: "k2" },
  { age: 70, net_worth: "200000", filter: "home", option: "renter" },
  { age: 45, net_worth: "300000", filter: "education", option: "bachelor" },
  { age: 40, net_worth: "250000", filter: "income", income: "85000" },
  { age: 50, net_worth: "800000", filter: "work", option: "selfemployed" },
];
const browser = await chromium.launch(); const page = await browser.newPage();
const errors = []; page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await page.goto(PAGE, { waitUntil: "domcontentloaded" });
let pass = 0;
for (const c of cases) {
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.fill("#age", String(c.age));
  if (c.filter) {
    await page.selectOption("#compare", c.filter);
    if (c.filter === "income") await page.fill("#income", c.income);
    else await page.click(`#filter-options .chip[data-id="${c.option}"]`);
  }
  await page.fill("#networth", c.net_worth);
  await page.click("#checker button[type=submit]");
  await page.waitForSelector("#results:not([hidden])");
  const ui = await page.evaluate(() => ({
    headline: document.getElementById("result-headline").textContent,
    detail: document.getElementById("result-detail").textContent,
    median: document.getElementById("stat-median").textContent,
    notice: document.getElementById("result-notice").hidden ? null : document.getElementById("result-notice").textContent }));
  const qs = new URLSearchParams(Object.entries(c).map(([k, v]) => [k, String(v)]));
  const api = await (await fetch(`${API}/v1/networth-by-age?${qs}`)).json();
  const apiView = { headline: api.result.headline, detail: api.result.detail,
    median: "$" + Math.round(api.group_stats.median).toLocaleString("en-US"), notice: api.comparison_group.notice };
  const same = JSON.stringify(ui) === JSON.stringify(apiView);
  if (same) pass++;
  console.log(`${same ? "PASS" : "FAIL"} ${qs} -> ${ui.headline} | median ${ui.median}${same ? "" : "\n  page: " + JSON.stringify(ui) + "\n  api:  " + JSON.stringify(apiView)}`);
}
console.log(`${pass}/${cases.length} match; page console errors: ${errors.length}`);
await browser.close(); process.exit(pass === cases.length ? 0 : 1);

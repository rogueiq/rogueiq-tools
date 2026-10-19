import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs=[]; p.on("pageerror",e=>errs.push(String(e))); p.on("console",m=>m.type()==="error"&&errs.push(m.text()));
await p.goto(process.argv[2], { waitUntil: "networkidle" });
const set = (id, v) => p.$eval(id, (el, v) => { el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); }, v);
await set("#age-slider", "34");
const steps = await p.$eval("#networth-slider", el => el.max);
// find step index for 150000
for (let i = 0; i <= steps; i++) { await set("#networth-slider", String(i)); if ((await p.inputValue("#networth")) === "150,000") break; }
console.log("age", await p.inputValue("#age"), "nw", await p.inputValue("#networth"), "->", await p.textContent("#result-headline"), "hidden?", await p.$eval("#results", e => e.hidden));
await p.fill("#networth", "123456"); console.log("typed ->", await p.textContent("#result-headline"), await p.textContent("#networth-out"));
await p.selectOption("#compare", "income"); await set("#income-slider", "20"); console.log("income", await p.inputValue("#income"), await p.textContent("#result-headline"));
console.log("errors", errs.length, errs); await b.close();

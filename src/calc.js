// Net Worth by Age: the same math as rogueiq/networth-by-age app.js, with no DOM.
// Every rule here mirrors a function in app.js (named in the comments) so API answers
// match the web page. Pure functions: nothing is stored or logged.
import { SCF_DATA, SCF_FILTERS } from "./data.js";

export const DISCLAIMER =
  "For education only. Not financial advice. RogueIQ builds education and tools, not personalized " +
  "financial advice. This calculator shows how Federal Reserve survey data is distributed; it does not " +
  "judge anyone's finances or say what to do with money.";

export const SOURCE = {
  publisher: "Board of Governors of the Federal Reserve System",
  survey: SCF_DATA.surveyName,
  survey_year: SCF_DATA.surveyYear,
  released: "2026-10-09",
  dollars: "2025 dollars",
  citation: `Board of Governors of the Federal Reserve System, ${SCF_DATA.surveyName} (released ${SCF_DATA.releasedOn}). ` +
    "Median and mean: SCF historical tables (public data), Table 4. Percentiles and filters: computed by RogueIQ " +
    "from the 2025 SCF Summary Extract using survey weights.",
  urls: {
    index: "https://www.federalreserve.gov/econres/scfindex.htm",
    table4: "https://www.federalreserve.gov/econres/files/scf2025_tables_public_real_historical.xlsx",
    summary_extract: "https://www.federalreserve.gov/econres/files/scfp2025excel.zip",
    report: "https://www.federalreserve.gov/publications/files/scf26.pdf",
  },
  notes: "Unit is families, grouped by age of the reference person. The SCF excludes the Forbes 400. " +
    "The Fed does not publish percentile cut-offs by age; those are computed from its public microdata.",
};
export const AS_OF = "2026-10-09";
export const WEB_URL = "https://rogueiq.github.io/networth-by-age/";

export class InputError extends Error {}

// app.js parseMoney
export function parseMoney(text) {
  if (typeof text === "number") return Number.isFinite(text) ? text : null;
  let s = String(text ?? "").trim().toLowerCase().replace(/[$,\s]/g, "");
  if (s === "") return null;
  let m = 1;
  if (s.endsWith("k")) { m = 1e3; s = s.slice(0, -1); }
  else if (s.endsWith("m")) { m = 1e6; s = s.slice(0, -1); }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s) * m;
}
export function ordinal(n) {
  const h = n % 100;
  if (h >= 11 && h <= 13) return n + "th";
  return n + ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th");
}
function bracketForAge(age) {
  return SCF_DATA.brackets.find((b) => age >= b.minAge && (b.maxAge === null || age <= b.maxAge));
}
function percentileRank(v, cuts) { let c = 0; for (const x of cuts) if (v >= x) c++; return c; }
const LEVEL_ORDER = [6, 3, 2];
function bandAtLevel(level, bracketId) {
  const minAge = SCF_DATA.brackets.find((b) => b.id === bracketId).minAge;
  return SCF_FILTERS.levels[level].find((b) => minAge >= b.minAge && (b.maxAge === null || minAge <= b.maxAge));
}
function resolveCell(filter, option, bracketId) {
  if (filter.allowedAge6 && !filter.allowedAge6.includes(bracketId)) return { ok: false, reason: "age" };
  const forced = option.forceLevel && option.forceLevel[bracketId];
  const start = forced || filter.startLevel;
  const tried = [];
  for (const level of LEVEL_ORDER.filter((l) => l <= start)) {
    const band = bandAtLevel(level, bracketId);
    const cell = option.cells[level + ":" + band.id];
    tried.push({ level, band, n: cell.n });
    if (cell.n >= SCF_FILTERS.minN && cell.p) return { ok: true, cell, level, band, tried, forced: Boolean(forced) };
  }
  return { ok: false, reason: "thin", tried };
}
function ageText(band) { return band.label.startsWith("under") ? band.label : "aged " + band.label; }
function incomeOptionFor(filter, income) {
  return filter.options[SCF_FILTERS.incomeCutoffs2024.filter((c) => income >= c).length];
}
const pick = (cuts, list) => Object.fromEntries(list.map((p) => ["p" + p, cuts[p - 1]]));
const bandOut = (b) => ({ id: b.id, label: b.label, min_age: b.minAge, max_age: b.maxAge });

// Describe what the API accepts (used by /openapi.json, MCP schema and docs)
export function filterCatalog() {
  return SCF_FILTERS.filters.map((f) => ({
    id: f.id, label: f.label,
    input: f.input === "income" ? "income (2024 household income before taxes, US$)" : "option",
    options: f.options.map((o) => ({ id: o.id, label: o.label })),
  }));
}
export const AGE_GROUPS = SCF_DATA.brackets.map((b) => b.id);

/**
 * params: { age?, age_group?, net_worth, filter?, option?, income? } (strings or numbers)
 * Returns the API result object or throws InputError with a plain-English message.
 */
export function networthPercentile(params) {
  const p = params || {};
  let bracket;
  if (p.age_group != null && p.age_group !== "") {
    bracket = SCF_DATA.brackets.find((b) => b.id === String(p.age_group));
    if (!bracket) throw new InputError(`age_group must be one of: ${AGE_GROUPS.join(", ")}.`);
  } else {
    const age = Number(p.age);
    if (p.age == null || p.age === "" || !Number.isFinite(age)) throw new InputError("Enter an age (age=34) or an age_group.");
    if (age < 18) throw new InputError("The survey covers families whose reference person is 18 or older.");
    if (age > 110) throw new InputError("Please check the age entered.");
    bracket = bracketForAge(Math.floor(age));
  }
  const netWorth = parseMoney(p.net_worth);
  if (netWorth === null) throw new InputError("Enter net_worth as a number, like 150000 or 150k. It can be negative.");

  const base = {
    tool: "networth_percentile_by_age",
    input: { age: p.age_group ? null : Math.floor(Number(p.age)), age_group: bracket.id, net_worth: netWorth,
      filter: p.filter || null, option: p.option || null, income: p.income != null && p.income !== "" ? parseMoney(p.income) : null },
  };
  const tail = { source: SOURCE, survey_year: SCF_DATA.surveyYear, as_of: AS_OF, dollar_basis: "2025 dollars",
    web_version: WEB_URL, disclaimer: DISCLAIMER };

  // ---- Age-only view (app.js showResults) ----
  if (!p.filter) {
    const cuts = bracket.percentiles;
    const rank = percentileRank(netWorth, cuts);
    const groupName = bracket.id === "under35" ? "under 35" : bracket.id === "75plus" ? "75 or older" : "aged " + bracket.label;
    let headline, detail, position;
    if (rank === 0) { position = "below_1st"; headline = "Below the 1st percentile";
      detail = `Your net worth is lower than the 1st-percentile cut-off for US families ${groupName}.`; }
    else if (rank === 99) { position = "top_1"; headline = "Top 1%";
      detail = `Your net worth is at or above the 99th-percentile cut-off for US families ${groupName}.`; }
    else { position = "within"; headline = `Higher than about ${rank}% of families`;
      detail = `That puts you around the ${ordinal(rank)} percentile for US families ${groupName}.`; }
    return { ...base,
      result: { percentile: rank, position, rounding: "nearest 1", headline, detail },
      comparison_group: { age_band: bandOut(bracket), filter: null, description: `US families ${groupName}`, survey_families: null, notice: null },
      group_stats: { median: bracket.median, mean: bracket.mean, percentiles: pick(cuts, [1, 5, 10, 25, 50, 75, 90, 95, 99]),
        fed_report_median: bracket.reportMedian, fed_report_mean: bracket.reportMean },
      ...tail };
  }

  // ---- Filtered view (app.js submit handler + showFilteredResults) ----
  const filter = SCF_FILTERS.filters.find((f) => f.id === String(p.filter));
  if (!filter) throw new InputError(`filter must be one of: ${SCF_FILTERS.filters.map((f) => f.id).join(", ")}.`);
  let option;
  if (filter.input === "income") {
    const income = parseMoney(p.income);
    if (income === null) throw new InputError("The income filter needs income (2024 household income before taxes), like 85000 or 85k.");
    option = incomeOptionFor(filter, income);
  } else {
    option = filter.options.find((o) => o.id === String(p.option));
    if (!option) throw new InputError(`option for filter "${filter.id}" must be one of: ${filter.options.map((o) => o.id).join(", ")}.`);
  }
  const r = resolveCell(filter, option, bracket.id);
  if (!r.ok) {
    if (r.reason === "age") throw new InputError(`"${filter.label}" is only available for people under 55.`);
    const w = r.tried[r.tried.length - 1];
    throw new InputError(`${option.label}: not enough survey data for this age group (only ${w.n} survey families even ${ageText(w.band)}). Pick another option.`);
  }
  const { cell, band, tried } = r;
  const cuts = cell.p, n = cell.n;
  const group = `US families ${ageText(band)} ${option.phrase}`;
  const rounded = Math.round(percentileRank(netWorth, cuts) / 5) * 5;
  let headline, detail, position;
  if (rounded <= 0) { position = "below_5th"; headline = "Below about the 5th percentile";
    detail = `Your net worth is below about the 5th percentile for ${group}.`; }
  else if (rounded >= 100) { position = "above_95th"; headline = "Above about the 95th percentile";
    detail = `Your net worth is above about the 95th percentile for ${group}.`; }
  else { position = "within"; headline = `Higher than about ${rounded}% of these families`;
    detail = `That puts you around the ${ordinal(rounded)} percentile for ${group}.`; }
  let notice = null;
  if (r.forced) notice = `${option.forceNote} This compares you with ${group} (${n} survey families).`;
  else if (tried.length > 1) notice = `Only ${tried[0].n} survey families ${ageText(tried[0].band)} ${option.phrase} are in the data. ` +
    `That's too few for a reliable answer, so we widened the age group: this compares you with ${group} (${n} survey families).`;
  else if (r.level < 6) notice = `This filter uses wider age groups so each group has enough survey families. You're compared with ${group}.`;
  const shown = n >= SCF_FILTERS.fullRangeN ? [10, 25, 50, 75, 90] : [25, 50, 75];
  return { ...base,
    input: { ...base.input, option: option.id },
    result: { percentile: Math.min(100, Math.max(0, rounded)), position, rounding: "nearest 5", headline, detail },
    comparison_group: { age_band: bandOut(band), filter: { id: filter.id, label: filter.label, option: option.id, option_label: option.label },
      description: group, survey_families: n, notice },
    group_stats: { median: cuts[49], mean: null, percentiles: pick(cuts, shown),
      fed_official_all_ages: option.official ? option.official.map(([label, median, mean]) => ({ label, median, mean })) : null },
    ...tail };
}

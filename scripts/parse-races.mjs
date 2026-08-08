#!/usr/bin/env node
/**
 * Parse Chapter 3 of the Homebrewery Markdown export into the generated
 * race registry used by the system.
 *
 * Usage:
 *   node scripts/parse-races.mjs path/to/markdown.md
 *
 * The parser intentionally keeps the full racial feature text while only
 * structuring fields that are safe to infer from the fixed chapter layout.
 */
import fs from "node:fs";
import path from "node:path";

const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/parse-races.mjs <markdown-file>");
  process.exit(1);
}

const text = fs.readFileSync(input, "utf8");
const start = text.indexOf("# [Chapter 3: Races and Subraces]");
const end = text.indexOf("# [Chapter 4: Classes]");
if (start < 0 || end < 0) throw new Error("Chapter 3 boundaries not found.");
const chapter = text.slice(start, end);

const HUMANOIDS = new Set([
  "Beastmen", "Ceralians", "Earthling", "Konatsian",
  "Mashin-jin", "Ogre", "Saiyans", "Shinling"
]);

const ABILITIES = {
  strength: "str", dexterity: "dex", constitution: "con",
  intelligence: "int", wisdom: "wis", charisma: "cha"
};

const SKILLS = {
  acrobatics: "acr", "animal handling": "ani", arcana: "arc",
  athletics: "ath", deception: "dec", history: "his", insight: "ins",
  intimidation: "itm", investigation: "inv", "ki control": "kic",
  medicine: "med", nature: "nat", perception: "prc", performance: "prf",
  persuasion: "per", religion: "rel", "sleight of hand": "slt",
  spirit: "spi", stealth: "ste", survival: "sur", technology: "tec"
};

function clean(value = "") {
  return value
    .replace(/\r/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)(?:\s*\{[^}]*\})?/g, "")
    .replace(/\{\{artist[\s\S]*?\}\}/g, "")
    .replace(/\\column/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function section(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^## <p>\\[${escaped}\\]\\(#p3\\)`, "m");
  const match = chapter.match(re);
  if (!match) return null;
  const start = match.index;
  const rest = chapter.slice(start + match[0].length);
  const next = rest.search(/^## <p>\[/m);
  return chapter.slice(start, next < 0 ? chapter.length : start + match[0].length + next).trim();
}

function field(source, label) {
  const re = new RegExp(`#### ${label}\\\\s*([\\\\s\\\\S]*?)(?=\\\\n#### |\\\\n### |$)`, "i");
  return clean(source.match(re)?.[1] ?? "");
}

function speed(value) {
  const match = value.match(/(\\d+)\\s*(?:feet|ft)/i);
  return match ? Number(match[1]) : null;
}

function skills(value) {
  return Object.entries(SKILLS)
    .filter(([name]) => new RegExp(`\\\\b${name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\\\b`, "i").test(value))
    .map(([, id]) => id);
}

function asi(value) {
  const text = clean(value).replace(/[*_<>]/g, "").replace(/\\s+/g, " ").trim(" :.");
  const result = { fixed: {}, choices: [], all: 0 };

  if (/Increase all Ability Scores by 1/i.test(text)) result.all = 1;

  for (const match of text.matchAll(/\\b([A-Za-z]+)\\s*\\+(\\d+)\\s+or\\s+([A-Za-z]+)\\s*\\+(\\d+)/gi)) {
    const a = ABILITIES[match[1].toLowerCase()];
    const b = ABILITIES[match[3].toLowerCase()];
    if (a && b) result.choices.push({ count: 1, bonusOptions: [Number(match[2]), Number(match[4])], abilities: [a, b] });
  }

  for (const match of text.matchAll(/\\b([A-Za-z]+)\\s+or\\s+([A-Za-z]+)\\s*\\+(\\d+)/gi)) {
    const a = ABILITIES[match[1].toLowerCase()];
    const b = ABILITIES[match[2].toLowerCase()];
    if (a && b) result.choices.push({ count: 1, bonus: Number(match[3]), abilities: [a, b] });
  }

  for (const match of text.matchAll(/Any one Ability Score\\s*\\+(\\d+)/gi)) {
    result.choices.push({ count: 1, bonus: Number(match[1]), abilities: "any" });
  }

  for (const [name, id] of Object.entries(ABILITIES)) {
    const match = text.match(new RegExp(`\\\\b${name}\\\\b\\\\s*\\\\+(\\\\d+)`, "i"));
    if (match) result.fixed[id] = Number(match[1]);
  }
  return result;
}

function features(source) {
  const marker = source.search(/### Racial Features/i);
  if (marker < 0) return [];
  const body = source.slice(marker);
  const headers = [...body.matchAll(/^#### (.+?)\\s*$/gm)];
  return headers.map((header, i) => ({
    name: clean(header[1]),
    description: clean(body.slice(header.index + header[0].length,
      headers[i + 1]?.index ?? body.length))
  })).filter(feature => feature.name && feature.description);
}

const names = [
  "Beastmen", "Ceralians", "Earthling", "Konatsian", "Mashin-jin",
  "Ogre", "Saiyans", "Shinling", "Alien", "Android", "Arcosian",
  "Bio-Android", "Chronin", "Demon", "Greys", "Majin", "Namekian",
  "Neko Majin", "Sateery", "Sekhmen-jin", "Yardratian"
];

const races = names.map(name => {
  const source = section(name);
  if (!source) throw new Error(`Race not found: ${name}`);
  const traits = /### Features/i.test(source) && !/### Racial Traits/i.test(source)
    ? source : source;
  const category = HUMANOIDS.has(name) ? "Humanoid" : "Alien";
  const abilityText = field(traits, "Ability Score (?:Increase|Improvement)");
  const speedText = field(traits, "Speed");
  const languageText = field(traits, "Languages?");
  const skillText = field(traits, "Skills");
  return {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name, category,
    description: clean(source.slice(source.indexOf("### Physical Description"),
      source.search(/### (?:Racial Traits|Features)/i) >= 0
        ? source.search(/### (?:Racial Traits|Features)/i) : source.length)),
    abilityBonuses: asi(abilityText),
    speed: speed(speedText),
    languages: languageText,
    skills: skills(skillText),
    skillChoiceCount: /(?:any )?2 .*skills/i.test(skillText) ? 2 : 0,
    lockedFeatures: [],
    features: features(source),
    sourceText: clean(source)
  };
});

const out = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../module/data/races.mjs");
fs.writeFileSync(out,
  "/** Generated from Chapter 3: Races and Subraces. */\nexport const DBZ_RACES = " +
  JSON.stringify(races, null, 2) + ";\n");
console.log(`Generated ${races.length} primary races -> ${out}`);

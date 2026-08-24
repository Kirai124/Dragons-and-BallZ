import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parseFormBonuses } from "../module/dragonball-rules.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJSON = file => JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
const readPack = name => fs.readFileSync(path.join(ROOT, "packs", `${name}.db`), "utf8")
  .split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));

const packs = ["races", "backgrounds", "classes", "features-training", "forms", "techniques", "equipment"];

test("all handbook content has source traceability", () => {
  for ( const pack of packs ) for ( const doc of readPack(pack) ) {
    assert.ok(doc.flags?.["dragons-and-ballz"]?.handbook?.startLine, `${pack}/${doc.name} missing handbook source line`);
    assert.ok(doc.system?.description?.value !== undefined, `${pack}/${doc.name} missing description`);
  }
});

test("techniques have executable identity fields", () => {
  const allowed = new Set(["melee", "weapon", "blast", "beam", "barrage", "omni", "otherKi", "stance"]);
  for ( const doc of readPack("techniques") ) {
    assert.ok(allowed.has(doc.system.techniqueType), `${doc.name}: invalid techniqueType`);
    assert.ok(Number.isInteger(doc.system.rank) && doc.system.rank >= 0 && doc.system.rank <= 4, `${doc.name}: invalid rank`);
    assert.equal(typeof doc.system.kiCost, "string", `${doc.name}: missing cost text`);
    assert.ok(doc.system.castingTime, `${doc.name}: missing casting time`);
  }
});

test("forms are categorized and known importer false positives are gone", () => {
  const forms = readPack("forms");
  const names = new Set(forms.map(doc => doc.name));
  assert.equal(names.has("Potential Unlock"), false, "Potential Unlock is a family heading, not a Form item");
  assert.equal(names.has("Kaioken"), false, "Kaioken is a family heading; Kaio-Ken rank Forms are the usable entries");
  const allowed = new Set(["transformation", "powerUp", "combinationTransformation", "combinationPowerUp"]);
  for ( const doc of forms ) {
    assert.ok(allowed.has(doc.system.category), `${doc.name}: invalid form category`);
    parseFormBonuses(doc.system.description.value); // parser must accept every shipped Form description
  }
});

test("corrected handbook Forms retain their mechanical fields", () => {
  const byName = new Map(readPack("forms").map(doc => [doc.name, doc]));
  const expected = {
    "Super Earthling": { rank: 2, powerBonus: 1, family: "" },
    "Earthling Potential": { rank: 3, powerBonus: 2, family: "" },
    "Capacity Breaker": { powerBonus: 1 },
    "Overdrive": { powerBonus: 2 },
    "Super Android": { powerBonus: 4 },
    "Ultimate Android": { powerBonus: 3 },
    "Fifth Form": { rank: 4 },
    "Namekian Split": { rank: 2 },
    "Full Power": { rank: 3 },
    "Super Full Power": { rank: 4 },
    "Four Witches Technique": { rank: 2 }
  };
  for ( const [name, fields] of Object.entries(expected) ) {
    const doc = byName.get(name); assert.ok(doc, `missing corrected Form ${name}`);
    for ( const [field, value] of Object.entries(fields) ) assert.equal(doc.system[field], value, `${name}.${field}`);
  }
});

test("DBZ localization used by final combat tabs exists in both languages", () => {
  const en = readJSON("lang/en.json");
  const de = readJSON("lang/de.json");
  for ( const key of [
    "DBZ.Transformations", "DBZ.TechniquesCombat", "DBZ.BasicKiBlast", "DBZ.KiConcealed",
    "DBZ.FormBonusDamage", "DBZ.DiagnosticsPassed", "DBZ.DiagnosticsFailed"
  ] ) {
    assert.ok(en[key], `English missing ${key}`);
    assert.ok(de[key], `German missing ${key}`);
  }
});

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");

test("character sheet exposes final DBZ tabs and quick actions", () => {
  const sheet = read("module/applications/actor/character-sheet.mjs");
  const techniques = read("templates/actors/tabs/character-techniques.hbs");
  const forms = read("templates/actors/tabs/character-forms.hbs");
  for ( const token of ["DBZ.Transformations", "DBZ.TechniquesCombat", "basicKiBlast", "clash", "senseKi", "concealKi"] ) {
    assert.ok(sheet.includes(token), `character sheet missing ${token}`);
  }
  assert.ok(techniques.includes("dbz-status-strip"));
  assert.ok(forms.includes("dbz-status-strip"));
});

test("runtime API exports diagnostics and combat workflows", () => {
  const workflow = read("module/dragonball-workflows.mjs");
  for ( const exported of ["useTechnique", "useForm", "useBasicKiBlast", "useClash", "useManeuver", "runDiagnostics"] ) {
    assert.match(workflow, new RegExp(`export\\s+(?:async\\s+)?function\\s+${exported}\\b`), `missing ${exported}`);
  }
  const main = read("dragons-and-ballz.mjs");
  assert.ok(main.includes("dragonball,"), "dragonball API not exposed on game.dnd5e");
});

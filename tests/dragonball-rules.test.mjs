import assert from "node:assert/strict";
import test from "node:test";
import { aggregateFormBonuses, handbookText, parseFormBonuses } from "../module/dragonball-rules.mjs";

test("handbookText normalizes Foundry HTML", () => {
  assert.equal(handbookText("<p>Ki &amp; Stamina</p><p>1d4&gt;1d6</p>"), "Ki & Stamina 1d4>1d6");
});

test("parseFormBonuses extracts only deterministic flat bonuses", () => {
  const result = parseFormBonuses(`
    <p>+2 to your AC</p>
    <p>Increase all Movement Speeds by 20 ft.</p>
    <p>You deal +2d6 to all Damage Rolls.</p>
    <p>Increase all Damage Die by 2 steps.</p>
    <p>You may make an additional attack as part of the Attack Action or Ki Blast Action.</p>`);
  assert.deepEqual(result, {
    ac: 2,
    movementFlat: 20,
    movementMultiplier: 1,
    damageDieSteps: 2,
    damage: ["2d6"],
    extraAttacks: 1
  });
});

test("parseFormBonuses handles speed multipliers", () => {
  assert.equal(parseFormBonuses("<p>Triple your Walk and Fly Speed.</p>").movementMultiplier, 3);
});

test("aggregateFormBonuses stacks independent active forms", () => {
  const total = aggregateFormBonuses([
    { system: { description: { value: "<p>+1 to your AC. Increase all Movement Speeds by 5 ft. You deal +1d4 to all Damage Rolls.</p>" } } },
    { system: { description: { value: "<p>+2 to your AC. Increase all Movement Speeds by 10 ft. You deal +1d6 to all Damage Rolls.</p>" } } }
  ]);
  assert.equal(total.ac, 3);
  assert.equal(total.movementFlat, 15);
  assert.deepEqual(total.damage, ["1d4", "1d6"]);
});

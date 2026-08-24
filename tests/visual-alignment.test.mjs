import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("character sheet keeps stock D&D5e visual primitives around DBZ content", () => {
  const sidebar = read("templates/actors/character-sidebar.hbs");
  const forms = read("templates/actors/tabs/character-forms.hbs");
  const techniques = read("templates/actors/tabs/character-techniques.hbs");
  const styles = read("less/v2/dbz.less");

  assert.match(sidebar, /class="lozenges dbz-lozenges"/);
  assert.match(sidebar, /class="meter sectioned hit-points dbz-ki meter-lg"/);
  assert.match(sidebar, /class="meter sectioned hit-points dbz-stamina meter-lg"/);
  assert.doesNotMatch(sidebar, /dbz-core-stats|dbz-stat-card/);

  assert.match(forms, /class="pills dbz-status-strip/);
  assert.match(forms, /class="card dbz-overview-card"/);
  assert.match(techniques, /class="card dbz-actions-card"/);
  assert.match(techniques, /class="gold-button dbz-action-button"/);
  assert.match(techniques, /class="card dbz-maneuvers"/);

  assert.match(styles, /--dnd5e-sheet-sidebar-width: 230px/);
  assert.match(styles, /--dnd5e-sheet-header-right-width: 280px/);
  assert.match(styles, /min-width: 800px/);
});

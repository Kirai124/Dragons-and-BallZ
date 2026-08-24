import TargetsField from "./data/chat-message/fields/targets-field.mjs";
import { aggregateFormBonuses } from "./dragonball-rules.mjs";

/**
 * Dragons and BallZ combat/resource workflows.
 * These helpers intentionally sit beside the inherited dnd5e activity engine so the
 * handbook-specific systems can evolve without rewriting every upstream activity class.
 */

const TECHNIQUE_ABILITIES = Object.freeze({
  blast: "wis",
  beam: "con",
  barrage: "dex",
  omni: "int",
  melee: "str",
  weapon: "str",
  otherKi: "wis",
  stance: "wis"
});

const KI_TYPES = new Set(["blast", "beam", "barrage", "omni", "otherKi"]);
const MARTIAL_TYPES = new Set(["melee", "weapon"]);

function localize(key, fallback=key) {
  const translated = game.i18n.localize(key);
  return translated === key ? fallback : translated;
}

function notify(type, message) {
  return ui.notifications?.[type]?.(message);
}

function stripHTML(html="") {
  return String(html)
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&sol;/gi, "/")
    .replace(/&times;/gi, "×")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHTML(value="") {
  return String(value).replace(/[&<>'"]/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[c]);
}

function numberFrom(text, fallback=0) {
  const match = String(text ?? "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : fallback;
}

function resourceKeyFromText(text, fallback="ki") {
  text = String(text ?? "").toLowerCase();
  if ( /god\s*ki/.test(text) ) return "godKi";
  if ( /stamina/.test(text) ) return "stamina";
  if ( /hit\s*point|\bhp\b/.test(text) ) return "hp";
  if ( /\bki\b/.test(text) ) return "ki";
  return fallback;
}

function parseCost(text, { description="", fallbackResource="ki" }={}) {
  const original = String(text ?? "").trim();
  const plain = stripHTML(description);
  const source = original && !/^special$/i.test(original) ? original : plain;
  const resource = resourceKeyFromText(source, fallbackResource);
  let amount = numberFrom(original, NaN);
  if ( !Number.isFinite(amount) && /^special$/i.test(original) ) {
    // Handbook special costs commonly begin with wording such as "For 25 Ki...".
    const resourceName = resource === "stamina" ? "Stamina" : resource === "godKi" ? "God\\s*Ki" : "Ki";
    const re = new RegExp(`(?:for|spend|costs?|expend)\\s+(\\d+)\\s+${resourceName}`, "i");
    const match = plain.match(re) ?? plain.match(new RegExp(`(\\d+)\\s+${resourceName}`, "i"));
    amount = match ? Number(match[1]) : 0;
  }
  if ( !Number.isFinite(amount) ) amount = 0;
  return {
    amount: Math.max(0, amount),
    resource,
    variable: /special|\bx\b|per\b|additional|each/i.test(original),
    original
  };
}

function getResource(actor, key) {
  if ( key === "hp" ) return actor.system.attributes?.hp;
  return actor.system.attributes?.[key];
}

export function resourceAvailable(actor, key) {
  const resource = getResource(actor, key);
  if ( !resource ) return 0;
  if ( key === "hp" || key === "godKi" ) return Math.max(0, Number(resource.value ?? 0));
  return Math.max(0, Number(resource.value ?? 0)) + Math.max(0, Number(resource.temp ?? 0));
}

/** Spend temporary resource first, as required by the handbook. */
export async function spendResource(actor, key, amount, { notifyOnFailure=true }={}) {
  amount = Math.max(0, Number(amount) || 0);
  if ( !amount ) return true;
  const resource = getResource(actor, key);
  if ( !resource ) return false;
  if ( resourceAvailable(actor, key) < amount ) {
    if ( notifyOnFailure ) notify("warn", localize("DBZ.NotEnoughResource", `Not enough ${key}.`));
    return false;
  }

  if ( key === "hp" || key === "godKi" ) {
    await actor.update({ [`system.attributes.${key}.value`]: Math.max(0, Number(resource.value ?? 0) - amount) });
    return true;
  }

  let remaining = amount;
  const temp = Math.max(0, Number(resource.temp ?? 0));
  const spendTemp = Math.min(temp, remaining);
  remaining -= spendTemp;
  const value = Math.max(0, Number(resource.value ?? 0) - remaining);
  const update = { [`system.attributes.${key}.value`]: value };
  if ( spendTemp ) update[`system.attributes.${key}.temp`] = temp - spendTemp;
  await actor.update(update);
  return true;
}

export async function restoreResource(actor, key, amount) {
  amount = Math.max(0, Number(amount) || 0);
  const resource = getResource(actor, key);
  if ( !resource || !amount ) return 0;
  const max = Math.max(0, Number(resource.effectiveMax ?? resource.max ?? resource.value ?? 0));
  const current = Math.max(0, Number(resource.value ?? 0));
  const value = Math.min(max, current + amount);
  if ( value !== current ) await actor.update({ [`system.attributes.${key}.value`]: value });
  return value - current;
}

export function getKiRank(actor) {
  const level = Math.max(0, Number(actor.system.details?.level ?? 0));
  if ( level >= 15 ) return 4;
  if ( level >= 10 ) return 3;
  if ( level >= 5 ) return 2;
  return level >= 1 ? 1 : 0;
}

function getPower(actor) {
  return Number(actor.system.attributes?.power?.total ?? actor.system.attributes?.power?.value ?? 0);
}

function isKiExhausted(actor) {
  return resourceAvailable(actor, "ki") <= 0;
}

function currentTurnStamp() {
  return {
    round: game.combat?.round ?? null,
    turn: game.combat?.turn ?? null,
    combatId: game.combat?.id ?? null
  };
}

async function setManeuverState(actor, key, value) {
  const state = foundry.utils.deepClone(actor.getFlag("dragons-and-ballz", "maneuvers") ?? {});
  if ( value === null || value === undefined ) delete state[key];
  else state[key] = value;
  if ( Object.keys(state).length ) await actor.setFlag("dragons-and-ballz", "maneuvers", state);
  else await actor.unsetFlag("dragons-and-ballz", "maneuvers");
}

function firstTargetActor() {
  return [...(game.user?.targets ?? [])][0]?.actor ?? null;
}

function maneuverStats(actor) {
  const abilityMod = Number(actor.system.abilities?.str?.mod ?? 0);
  const proficiency = Number(actor.system.attributes?.prof ?? 0);
  const power = getPower(actor);
  return { abilityMod, proficiency, power, attack: proficiency + abilityMod + power, dc: 8 + proficiency + abilityMod + power };
}

async function rollTargetSave(target, ability, dc, flavor) {
  if ( !target || (!game.user.isGM && !target.isOwner) ) return null;
  const rolls = await target.rollSavingThrow({ ability, target: dc }, { configure: false }, { data: { flavor } });
  return rolls?.[0] ?? null;
}

function hasActorItem(actor, name) {
  const lower = name.toLowerCase();
  return actor.items.some(i => i.name?.toLowerCase() === lower || i.name?.toLowerCase().includes(lower));
}

function getTechniqueAbility(actor, item) {
  let ability = TECHNIQUE_ABILITIES[item.system.techniqueType] ?? "wis";
  // Martial Artists may use Dexterity instead of Strength for Melee Techniques.
  if ( item.system.techniqueType === "melee" && hasActorItem(actor, "martial artist") ) {
    const str = actor.system.abilities?.str?.mod ?? 0;
    const dex = actor.system.abilities?.dex?.mod ?? 0;
    if ( dex > str ) ability = "dex";
  }
  return ability;
}

function techniqueStaticBonus(actor, item) {
  // Persisted per-technique mastery/static bonus is authoritative. Actor-wide bonuses can be added by effects/modules.
  const itemBonus = Number(item.system.staticBonus ?? 0);
  const flagBonus = Number(foundry.utils.getProperty(actor.flags, `dragons-and-ballz.techniqueBonuses.${item.system.techniqueType}`) ?? 0);
  const globalBonus = Number(foundry.utils.getProperty(actor.flags, "dragons-and-ballz.techniqueBonuses.all") ?? 0);
  return itemBonus + flagBonus + globalBonus;
}

export function getTechniqueStats(actor, item, { clashRank=0 }={}) {
  const ability = getTechniqueAbility(actor, item);
  const abilityMod = Number(actor.system.abilities?.[ability]?.mod ?? 0);
  const proficiency = Number(actor.system.attributes?.prof ?? 0);
  const power = getPower(actor);
  const staticBonus = techniqueStaticBonus(actor, item) + Number(clashRank || 0);
  return {
    ability,
    abilityMod,
    proficiency,
    power,
    staticBonus,
    attack: proficiency + abilityMod + power + staticBonus,
    dc: 8 + proficiency + abilityMod + power + staticBonus
  };
}

function techniqueClass(type) {
  if ( KI_TYPES.has(type) ) return "ki";
  if ( MARTIAL_TYPES.has(type) ) return "martial";
  return "other";
}

function saveAbilityFromDescription(text) {
  const m = stripHTML(text).match(/\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+Saving\s+Throw/i);
  if ( !m ) return null;
  return ({ strength: "str", dexterity: "dex", constitution: "con", intelligence: "int", wisdom: "wis", charisma: "cha" })[m[1].toLowerCase()];
}

function attackCountFromDescription(text) {
  const plain = stripHTML(text);
  const m = plain.match(/(?:make|roll)\s+(\d+)\s+[^.]{0,45}?attack\s+rolls?/i);
  return m ? Math.clamp(Number(m[1]), 1, 20) : 1;
}

function hasAttackRoll(text) {
  return /\b(?:attack|combo)\s+roll\b/i.test(stripHTML(text));
}

function damageTypeKey(label) {
  const normalized = label.toLowerCase();
  const aliases = {
    ki: "ki", destruction: "destruction", bludgeoning: "bludgeoning", piercing: "piercing", slashing: "slashing",
    acid: "acid", cold: "cold", fire: "fire", force: "force", lightning: "lightning", necrotic: "necrotic",
    poison: "poison", psychic: "psychic", radiant: "radiant", thunder: "thunder"
  };
  return aliases[normalized] ?? normalized;
}

function getUnarmedDie(actor) {
  const martial = Object.values(actor.classes ?? {}).find(c => /martial\s*artist/i.test(c.name));
  if ( martial ) {
    const level = Number(martial.system.levels ?? 0);
    if ( level >= 17 ) return "1d12";
    if ( level >= 13 ) return "1d10";
    if ( level >= 9 ) return "1d8";
    if ( level >= 5 ) return "1d6";
    return "1d4";
  }
  return "1d4";
}

function extractDamageParts(item, actor) {
  const plain = stripHTML(item.system.description?.value ?? "");
  const parts = [];
  // Capture standard dice expressions immediately followed by a damage type.
  const re = /(\d+d\d+(?:\s*[+\-]\s*\d+)?)\s+(Ki|Destruction|Bludgeoning|Piercing|Slashing|Acid|Cold|Fire|Force|Lightning|Necrotic|Poison|Psychic|Radiant|Thunder)\s+Damage/gi;
  for ( const match of plain.matchAll(re) ) {
    const key = `${match[1].replace(/\s+/g, "")}::${match[2].toLowerCase()}`;
    if ( parts.some(p => p.key === key) ) continue;
    parts.push({ key, formula: match[1].replace(/\s+/g, ""), type: damageTypeKey(match[2]), label: match[2] });
  }

  if ( /Unarmed\s+Strike\s+Damage\s+Die/i.test(plain) ) {
    const formula = getUnarmedDie(actor);
    const key = `${formula}::bludgeoning`;
    if ( !parts.some(p => p.key === key) ) parts.unshift({ key, formula, type: "bludgeoning", label: "Bludgeoning" });
  }
  return parts;
}

const DIE_STEPS = [4, 6, 8, 10, 12];
function stepDie(count, faces) {
  const idx = DIE_STEPS.indexOf(faces);
  if ( idx >= 0 && idx < DIE_STEPS.length - 1 ) return [count, DIE_STEPS[idx + 1]];
  if ( faces === 12 ) return [count * 2, 6];
  // Continue the post-d12 progression by increasing faces before adding another die pair.
  if ( faces === 6 && count >= 2 ) return [count, 8];
  if ( faces === 8 && count >= 2 ) return [count, 10];
  if ( faces === 10 && count >= 2 ) return [count, 12];
  return [count + 1, faces];
}

export function chargeDamageFormula(formula, steps=0) {
  let out = String(formula);
  for ( let n = 0; n < steps; n++ ) {
    out = out.replace(/(\d+)d(\d+)/gi, (_m, count, faces) => {
      const [c, f] = stepDie(Number(count), Number(faces));
      return `${c}d${f}`;
    });
  }
  return out;
}

function activeForms(actor) {
  const ids = actor.getFlag("dragons-and-ballz", "activeForms") ?? [];
  return ids.map(id => actor.items.get(id)).filter(i => i?.type === "form");
}

function activeTechniques(actor) {
  return actor.getFlag("dragons-and-ballz", "activeTechniques") ?? [];
}

function formSlot(item) {
  return /powerUp/i.test(item.system.category) ? "powerUp" : "transformation";
}

function sameFamily(a, b) {
  if ( !a?.system.family || !b?.system.family ) return false;
  return a.system.family.trim().toLowerCase() === b.system.family.trim().toLowerCase();
}

function formUpkeep(item) {
  return parseCost(item.system.upkeepCost, {
    description: item.system.description?.value,
    fallbackResource: item.system.resource ?? "stamina"
  });
}

function formActivationCost(item) {
  const text = String(item.system.activationCost ?? "").trim();
  if ( !text ) return formUpkeep(item);
  return parseCost(text, {
    description: item.system.description?.value,
    fallbackResource: item.system.resource ?? "stamina"
  });
}

function allAvailableActors() {
  const actors = new Map();
  for ( const actor of game.actors ?? [] ) actors.set(actor.uuid, actor);
  for ( const token of canvas?.tokens?.placeables ?? [] ) if ( token.actor ) actors.set(token.actor.uuid, token.actor);
  return [...actors.values()];
}

function getTagTeamParticipants(leadActor, leadItem) {
  const participants = [];
  for ( const actor of allAvailableActors() ) {
    if ( actor.uuid === leadActor.uuid ) continue;
    const state = actor.getFlag?.("dragons-and-ballz", "tagTeam");
    if ( !state || state.leadActorUuid !== leadActor.uuid || state.leadItemId !== leadItem.id ) continue;
    const item = actor.items?.get(state.itemId);
    if ( item?.type !== "technique" ) continue;
    participants.push({ actor, item, state });
  }
  return participants;
}

async function postChat(actor, title, content, { item=null }={}) {
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="dnd5e2 chat-card dbz-chat-card"><h3>${escapeHTML(title)}</h3>${content}</div>`,
    flags: { "dragons-and-ballz": { dbzWorkflow: true, itemUuid: item?.uuid ?? null } }
  });
}

async function postRoll(actor, formula, flavor, { data={} }={}) {
  const roll = await (new Roll(formula, data)).evaluate();
  await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor });
  return roll;
}

/** Post a native 5e damage roll so Foundry's normal damage workflow and apply-damage controls remain available. */
async function postDamageRoll(actor, formula, type, flavor, { data={} }={}) {
  const targets = [...(game.user?.targets ?? [])];
  try {
    const rolls = await CONFIG.Dice.DamageRoll.build({
      hookNames: ["damage"],
      rolls: [{
        parts: [formula],
        data,
        options: { type, types: [type] }
      }]
    }, { configure: false }, {
      create: true,
      data: {
        flavor,
        speaker: ChatMessage.getSpeaker({ actor }),
        system: { targets: TargetsField.getDescriptors(targets) },
        type: "damage"
      }
    });
    return rolls?.[0] ?? null;
  } catch (err) {
    console.warn("Dragons & BallZ | Falling back to a generic damage roll.", err);
    return postRoll(actor, formula, flavor, { data });
  }
}

async function useDialog(item, actor, cost, { charging=null }={}) {
  const chargeable = !!item.system.chargeable;
  const hasGodKi = resourceAvailable(actor, "godKi") > 0;
  const alreadyCharging = charging?.itemId === item.id;
  const variable = cost.variable;
  if ( !chargeable && !variable && !hasGodKi ) return {
    action: "cast", spend: cost.amount, useGodKi: false, overcharge: 0
  };

  const resourceLabel = cost.resource === "stamina" ? localize("DBZ.Stamina", "Stamina") : localize("DBZ.Ki", "Ki");
  const content = `
    <fieldset class="dbz-usage-dialog">
      <legend>${escapeHTML(item.name)}</legend>
      <div class="form-group"><label>${escapeHTML(resourceLabel)}</label>
        <input type="number" name="spend" min="0" step="1" value="${cost.amount}"></div>
      ${chargeable ? `<div class="form-group"><label>${alreadyCharging ? localize("DBZ.ReleaseOrCharge", "Release / continue charging") : localize("DBZ.ChargeTechnique", "Charge technique")}</label>
        <select name="action"><option value="cast">${alreadyCharging ? localize("DBZ.Release", "Release") : localize("DBZ.Cast", "Cast")}</option><option value="charge">${alreadyCharging ? localize("DBZ.ContinueCharge", "Continue charging") : localize("DBZ.Charge", "Charge")}</option></select></div>` : `<input type="hidden" name="action" value="cast">`}
      ${cost.resource === "ki" && hasGodKi ? `<div class="form-group"><label>${localize("DBZ.UseGodKi", "Use 1 God Ki as 200 Ki")}</label><input type="checkbox" name="useGodKi"></div>` : ""}
      ${cost.resource === "ki" ? `<div class="form-group"><label>${localize("DBZ.OverchargeKi", "Additional overcharge Ki")}</label><input type="number" name="overcharge" min="0" step="1" value="0"></div>` : ""}
    </fieldset>`;

  return foundry.applications.api.DialogV2.prompt({
    rejectClose: false,
    content,
    window: { title: localize("DBZ.TechniqueUse", "Use Technique") },
    position: { width: 430 },
    ok: {
      label: localize("DBZ.Confirm", "Confirm"),
      callback: (_event, button) => ({
        action: button.form.elements.action?.value ?? "cast",
        spend: Math.max(0, Number(button.form.elements.spend?.value ?? cost.amount)),
        useGodKi: !!button.form.elements.useGodKi?.checked,
        overcharge: Math.max(0, Number(button.form.elements.overcharge?.value ?? 0))
      })
    }
  });
}

export async function useTechnique(item, config={}) {
  const actor = item.actor;
  if ( !actor ) return item.displayCard?.();
  if ( isKiExhausted(actor) ) {
    notify("warn", localize("DBZ.KiExhaustionBlocksTechniques", "Ki Exhaustion prevents you from using Techniques."));
    return;
  }
  if ( item.system.techniqueType === "stance" && /passive/i.test(item.system.duration ?? "") ) return item.displayCard();

  const rank = Number(item.system.rank ?? 0);
  const kiRank = getKiRank(actor);
  if ( rank && rank > kiRank ) {
    notify("warn", localize("DBZ.TechniqueRankTooHigh", `${item.name} is Rank ${rank}, but this character is Ki Rank ${kiRank}.`));
  }

  const description = item.system.description?.value ?? "";
  const cost = parseCost(item.system.kiCost, { description, fallbackResource: "ki" });
  const charging = actor.getFlag("dragons-and-ballz", "chargingTechnique") ?? null;
  const usage = await useDialog(item, actor, cost, { charging });
  if ( !usage ) return;

  let chargeRounds = charging?.itemId === item.id ? Number(charging.rounds ?? 0) : 0;
  const isRelease = usage.action === "cast" && chargeRounds > 0;
  const spend = isRelease ? 0 : Math.max(0, Number(usage.spend ?? 0));
  const additionalOvercharge = Math.max(0, Number(usage.overcharge ?? 0));
  let overchargeKi = charging?.itemId === item.id ? Math.max(0, Number(charging?.overchargeKi ?? 0)) : 0;

  // God Ki replaces exactly 200 Ki. Any unused portion becomes overcharge without also
  // charging the character that same amount of normal Ki. Costs above 200 still require
  // the remainder in ordinary Ki. Additional overcharge is always paid in ordinary Ki.
  const useGodKi = !isRelease && usage.useGodKi && (cost.resource === "ki");
  const required = new Map();
  if ( useGodKi ) {
    required.set("godKi", 1);
    const remainingBaseKi = Math.max(0, spend - 200);
    const automaticExcess = Math.max(0, 200 - spend);
    overchargeKi += automaticExcess + additionalOvercharge;
    if ( remainingBaseKi + additionalOvercharge ) required.set("ki", remainingBaseKi + additionalOvercharge);
  } else {
    if ( spend ) required.set(cost.resource, (required.get(cost.resource) ?? 0) + spend);
    if ( additionalOvercharge ) {
      required.set("ki", (required.get("ki") ?? 0) + additionalOvercharge);
      overchargeKi += additionalOvercharge;
    }
  }

  // Validate every required resource before changing the actor so a failed secondary
  // payment never leaves a partially-paid Technique behind.
  for ( const [resource, amount] of required ) {
    if ( resourceAvailable(actor, resource) < amount ) {
      notify("warn", localize("DBZ.NotEnoughResource", `Not enough ${resource}.`));
      return;
    }
  }
  for ( const [resource, amount] of required ) {
    if ( !(await spendResource(actor, resource, amount, { notifyOnFailure: false })) ) return;
  }

  if ( usage.action === "charge" ) {
    chargeRounds += 1;
    await actor.setFlag("dragons-and-ballz", "chargingTechnique", {
      itemId: item.id,
      rounds: chargeRounds,
      overchargeKi,
      startedRound: charging?.startedRound ?? game.combat?.round ?? null,
      startedTurn: charging?.startedTurn ?? game.combat?.turn ?? null
    });
    const concentrating = CONFIG.specialStatusEffects?.CONCENTRATING;
    if ( concentrating ) await actor.toggleStatusEffect(concentrating, { active: true });
    await postChat(actor, item.name, `<p><strong>${localize("DBZ.Charging", "Charging")}</strong>: ${chargeRounds}</p><p>${localize("DBZ.ChargeEffect", "All damage dice are raised by one die step for each charge.")}</p>`, { item });
    return { charged: true, rounds: chargeRounds };
  }

  if ( isRelease ) {
    await actor.unsetFlag("dragons-and-ballz", "chargingTechnique");
    const concentrating = CONFIG.specialStatusEffects?.CONCENTRATING;
    if ( concentrating ) await actor.toggleStatusEffect(concentrating, { active: false });
  }

  let stats = getTechniqueStats(actor, item);
  const saveAbility = saveAbilityFromDescription(description);
  const attack = hasAttackRoll(description);
  const attackCount = attack ? attackCountFromDescription(description) : 0;
  const formBonuses = aggregateFormBonuses(activeForms(actor));
  const totalDieSteps = chargeRounds + formBonuses.damageDieSteps;
  let damages = extractDamageParts(item, actor).map(d => ({ ...d, formula: chargeDamageFormula(d.formula, totalDieSteps) }));
  for ( const formula of formBonuses.damage ) {
    damages.push({ formula, type: "ki", label: localize("DBZ.FormBonusDamage", "Form Bonus"), key: `form-${formula}` });
  }
  const overchargeDamage = Math.floor(overchargeKi / 5);
  if ( overchargeDamage ) damages.push({ formula: String(overchargeDamage), type: "ki", label: "Ki", key: `overcharge-${overchargeDamage}` });

  // Tag Team Attack adds each participant's Static Bonus + Power to the lead roll/DC and
  // appends the participant Technique's damage/effects to the lead Technique.
  const tagTeam = getTagTeamParticipants(actor, item);
  if ( tagTeam.length ) {
    const tagBonus = tagTeam.reduce((sum, participant) => {
      const pstats = getTechniqueStats(participant.actor, participant.item);
      return sum + pstats.staticBonus + pstats.power;
    }, 0);
    stats = { ...stats, attack: stats.attack + tagBonus, dc: stats.dc + tagBonus, tagBonus };
    for ( const participant of tagTeam ) {
      damages.push(...extractDamageParts(participant.item, participant.actor));
    }
  }

  const abilityLabel = CONFIG.DND5E.abilities?.[stats.ability]?.label ?? stats.ability.toUpperCase();
  const typeLabel = localize(`DBZ.ITEM.TechniqueTypes.${item.system.techniqueType}`, item.system.techniqueType);
  const detailLines = [
    `<p><strong>${escapeHTML(typeLabel)}</strong> · ${localize("DBZ.KiRank", "Rank")} ${rank || localize("DBZ.ITEM.Special", "Special")}</p>`,
    `<p>${localize("DBZ.TechniqueAbility", "Technique ability")}: ${escapeHTML(abilityLabel)} · ${localize("DBZ.AttackBonus", "Attack")} ${stats.attack >= 0 ? "+" : ""}${stats.attack} · ${localize("DBZ.SaveDC", "Save DC")} ${stats.dc}</p>`,
    chargeRounds ? `<p>${localize("DBZ.ReleasedCharge", "Released after charging")}: ${chargeRounds}</p>` : "",
    overchargeDamage ? `<p>${localize("DBZ.OverchargeDamage", "Overcharge damage")}: +${overchargeDamage} Ki</p>` : "",
    tagTeam.length ? `<p><strong>${localize("DBZ.TagTeamAttack", "Tag Team Attack")}</strong>: ${tagTeam.map(p => escapeHTML(p.actor.name)).join(", ")} · +${stats.tagBonus ?? 0}</p>` : "",
    saveAbility ? `<p><strong>${escapeHTML(CONFIG.DND5E.abilities?.[saveAbility]?.label ?? saveAbility.toUpperCase())} ${localize("DBZ.SavingThrow", "Saving Throw")}: DC ${stats.dc}</strong></p>` : ""
  ].join("");
  await postChat(actor, item.name, detailLines + (description ? `<hr>${description}` : ""), { item });

  const results = { stats, attacks: [], damages: [], saveAbility, chargeRounds };
  for ( let i = 0; i < attackCount; i++ ) {
    const flavor = `${item.name} — ${localize("DBZ.AttackRoll", "Attack Roll")}${attackCount > 1 ? ` ${i + 1}/${attackCount}` : ""}`;
    results.attacks.push(await postRoll(actor, "1d20 + @bonus", flavor, { data: { bonus: stats.attack } }));
  }
  for ( const damage of damages ) {
    results.damages.push(await postDamageRoll(actor, damage.formula, damage.type, `${item.name} — ${damage.label} ${localize("DBZ.Damage", "Damage")}`));
  }

  // Explicit Upkeep techniques remain active and consume their listed upkeep at the start of later turns.
  const upkeepMatch = String(item.system.duration ?? "").match(/Upkeep(?:\s*\(([^)]+)\))?/i);
  if ( upkeepMatch ) {
    const upkeepText = upkeepMatch[1] ?? item.system.kiCost;
    const upkeep = parseCost(upkeepText, { description, fallbackResource: "ki" });
    const current = activeTechniques(actor).filter(t => t.itemId !== item.id);
    current.push({ itemId: item.id, amount: upkeep.amount, resource: upkeep.resource });
    await actor.setFlag("dragons-and-ballz", "activeTechniques", current);
  }

  for ( const participant of tagTeam ) {
    await participant.actor.unsetFlag("dragons-and-ballz", "tagTeam");
    const concentrating = CONFIG.specialStatusEffects?.CONCENTRATING;
    if ( concentrating ) await participant.actor.toggleStatusEffect(concentrating, { active: false });
  }
  return results;
}

export function getBasicKiBlastStats(actor) {
  const dex = Number(actor.system.abilities?.dex?.mod ?? 0);
  const prof = Number(actor.system.attributes?.prof ?? 0);
  const power = getPower(actor);
  let formula = "1d4";

  const blaster = Object.values(actor.classes ?? {}).find(c => /\bblaster\b/i.test(c.name));
  if ( blaster ) {
    const level = Number(blaster.system.levels ?? 0);
    if ( level >= 20 ) formula = "2d8";
    else if ( level >= 16 ) formula = "1d12";
    else if ( level >= 12 ) formula = "1d10";
    else if ( level >= 8 ) formula = "1d8";
    else if ( level >= 4 ) formula = "1d6";
  }
  let steps = 0;
  if ( hasActorItem(actor, "sharpshooter") ) steps += 2;
  if ( hasActorItem(actor, "powerful energy") ) steps += 1;
  const formBonuses = aggregateFormBonuses(activeForms(actor));
  steps += formBonuses.damageDieSteps;
  formula = chargeDamageFormula(formula, steps);

  const staticBonus = Number(foundry.utils.getProperty(actor.flags, "dragons-and-ballz.techniqueBonuses.basicKiBlast") ?? 0);
  return {
    attack: prof + dex + power + staticBonus,
    damage: `${formula} + @dex`,
    bonusDamage: [...formBonuses.damage],
    extraAttacks: formBonuses.extraAttacks,
    range: "30/90",
    dex,
    power,
    staticBonus
  };
}

export async function useBasicKiBlast(actor) {
  if ( resourceAvailable(actor, "ki") <= 0 ) {
    notify("warn", localize("DBZ.BasicKiRequiresKi", "You need at least 1 Ki to use a Basic Ki Blast."));
    return;
  }
  const stats = getBasicKiBlastStats(actor);
  const maxExtra = Math.max(0, Number(actor.system.attributes?.prof ?? 0));
  let extra = 0;
  if ( maxExtra > 0 && resourceAvailable(actor, "stamina") > 0 ) {
    const result = await foundry.applications.api.DialogV2.prompt({
      rejectClose: false,
      content: `<fieldset><legend>${localize("DBZ.BasicKiBlast", "Basic Ki Blast")}</legend><div class="form-group"><label>${localize("DBZ.ExtraKiBlastAttacks", "Extra attacks (1 Stamina each)")}</label><input type="number" name="extra" min="0" max="${Math.min(maxExtra, resourceAvailable(actor, "stamina"))}" step="1" value="0"></div></fieldset>`,
      window: { title: localize("DBZ.BasicKiBlast", "Basic Ki Blast") },
      position: { width: 410 },
      ok: { label: localize("DBZ.Fire", "Fire"), callback: (_e, button) => Number(button.form.elements.extra.value || 0) }
    });
    if ( result === null ) return;
    extra = Math.clamp(Number(result) || 0, 0, Math.min(maxExtra, resourceAvailable(actor, "stamina")));
  }
  if ( extra && !(await spendResource(actor, "stamina", extra)) ) return;

  await postChat(actor, localize("DBZ.BasicKiBlast", "Basic Ki Blast"), `<p>${localize("DBZ.Range", "Range")}: ${stats.range}</p><p>${localize("DBZ.AttackBonus", "Attack")}: ${stats.attack >= 0 ? "+" : ""}${stats.attack}</p><p>${localize("DBZ.Damage", "Damage")}: ${escapeHTML(stats.damage.replace("@dex", String(stats.dex)))} Ki</p>`);
  const count = 1 + stats.extraAttacks + extra;
  for ( let i = 0; i < count; i++ ) {
    await postRoll(actor, "1d20 + @bonus", `${localize("DBZ.BasicKiBlast", "Basic Ki Blast")} — ${localize("DBZ.AttackRoll", "Attack Roll")} ${i + 1}/${count}`, { data: { bonus: stats.attack } });
    await postDamageRoll(actor, stats.damage, "ki", `${localize("DBZ.BasicKiBlast", "Basic Ki Blast")} — ${localize("DBZ.Damage", "Damage")}`, { data: { dex: stats.dex } });
    for ( const formula of stats.bonusDamage ) {
      await postDamageRoll(actor, formula, "ki", `${localize("DBZ.BasicKiBlast", "Basic Ki Blast")} — ${localize("DBZ.FormBonusDamage", "Form Bonus")}`);
    }
  }
}

export async function useForm(item) {
  const actor = item.actor;
  if ( !actor ) return item.displayCard?.();
  if ( isKiExhausted(actor) ) {
    notify("warn", localize("DBZ.KiExhaustionBlocksForms", "Ki Exhaustion prevents you from activating Forms."));
    return;
  }
  const current = activeForms(actor);
  const active = current.some(f => f.id === item.id);
  if ( active ) {
    await actor.setFlag("dragons-and-ballz", "activeForms", current.filter(f => f.id !== item.id).map(f => f.id));
    await postChat(actor, item.name, `<p>${localize("DBZ.FormDeactivated", "Form deactivated.")}</p>`, { item });
    actor.render?.();
    return { active: false };
  }

  const slot = formSlot(item);
  const slotConflict = current.find(f => formSlot(f) === slot);
  const familyConflict = current.find(f => sameFamily(f, item));
  const replacing = familyConflict ?? slotConflict;
  const same = replacing && sameFamily(replacing, item);
  const newCost = formUpkeep(item);
  const newActivation = formActivationCost(item);
  const oldActivation = replacing ? formActivationCost(replacing) : { amount: 0, resource: newActivation.resource };
  let activationAmount = newActivation.amount;
  if ( same && oldActivation.resource === newActivation.resource ) {
    activationAmount = Math.max(0, newActivation.amount - oldActivation.amount);
  }

  if ( item.system.godly && resourceAvailable(actor, "godKi") <= 0 ) {
    notify("warn", localize("DBZ.GodFormRequiresGodKi", "This God Form requires God Ki."));
    return;
  }
  if ( activationAmount && !(await spendResource(actor, newActivation.resource, activationAmount)) ) return;

  const remove = new Set([slotConflict?.id, familyConflict?.id, item.id].filter(Boolean));
  const next = current.filter(f => !remove.has(f.id)).map(f => f.id);
  next.push(item.id);
  await actor.setFlag("dragons-and-ballz", "activeForms", next);

  let berserk = "";
  if ( item.system.berserker ) {
    const state = actor.getFlag("dragons-and-ballz", "berserkFormDCs") ?? {};
    const first = !(item.id in state);
    const dc = Number(state[item.id] ?? item.system.berserkDC ?? 10);
    if ( first ) {
      state[item.id] = dc;
      await actor.setFlag("dragons-and-ballz", "berserkFormDCs", state);
      await actor.toggleStatusEffect("berserk", { active: true });
      berserk = `<p><strong>${localize("DBZ.BerserkAutoFail", "First Berserker save automatically failed.")}</strong></p>`;
    } else {
      const [roll] = await actor.rollSavingThrow({ ability: "wis" }) ?? [];
      if ( roll && roll.total >= dc ) {
        state[item.id] = dc + 1;
        await actor.setFlag("dragons-and-ballz", "berserkFormDCs", state);
        await actor.toggleStatusEffect("berserk", { active: false });
        berserk = `<p>${localize("DBZ.BerserkSavePassed", "Berserker save passed")} (DC ${dc}).</p>`;
      } else {
        await actor.toggleStatusEffect("berserk", { active: true });
        berserk = `<p>${localize("DBZ.BerserkSaveFailed", "Berserker save failed")} (DC ${dc}).</p>`;
      }
    }
  }

  await postChat(actor, item.name, `<p><strong>${localize("DBZ.FormActivated", "Form activated")}</strong></p><p>${localize("DBZ.Upkeep", "Upkeep")}: ${newCost.amount} ${escapeHTML(newCost.resource)}</p><p>${localize("DBZ.PowerBonus", "Power Bonus")}: ${Number(item.system.powerBonus ?? 0) >= 0 ? "+" : ""}${Number(item.system.powerBonus ?? 0)}</p>${berserk}`, { item });
  actor.render?.();
  return { active: true };
}

export async function deactivateAllForms(actor, { reason="" }={}) {
  const forms = activeForms(actor);
  if ( !forms.length ) return;
  await actor.unsetFlag("dragons-and-ballz", "activeForms");
  if ( reason ) await postChat(actor, localize("DBZ.FormsEnded", "Forms ended"), `<p>${escapeHTML(reason)}</p>`);
}

async function processBerserkUpkeep(actor, form) {
  if ( !form.system.berserker ) return;
  const state = actor.getFlag("dragons-and-ballz", "berserkFormDCs") ?? {};
  const dc = Number(state[form.id] ?? form.system.berserkDC ?? 10);
  const [roll] = await actor.rollSavingThrow({ ability: "wis" }) ?? [];
  if ( roll && roll.total >= dc ) {
    state[form.id] = dc + 1;
    await actor.setFlag("dragons-and-ballz", "berserkFormDCs", state);
    await actor.toggleStatusEffect("berserk", { active: false });
  } else await actor.toggleStatusEffect("berserk", { active: true });
}

export async function processTurnStart(actor, combat) {
  if ( !actor?.system?.isCharacter ) return;

  // Block and Wild Sense last until the start of the user's next turn.
  const maneuvers = actor.getFlag("dragons-and-ballz", "maneuvers") ?? {};
  if ( maneuvers.block ) await setManeuverState(actor, "block", null);
  if ( maneuvers.wildSense ) await setManeuverState(actor, "wildSense", null);

  // Form upkeep. If the resource cannot be paid, the form ends instead.
  const forms = activeForms(actor);
  const surviving = [];
  for ( const form of forms ) {
    const upkeep = formUpkeep(form);
    if ( upkeep.amount && !(await spendResource(actor, upkeep.resource, upkeep.amount, { notifyOnFailure: false })) ) {
      await postChat(actor, form.name, `<p>${localize("DBZ.FormEndedNoUpkeep", "Form ended because its upkeep could not be paid.")}</p>`, { item: form });
      continue;
    }
    surviving.push(form.id);
    await processBerserkUpkeep(actor, form);
  }
  if ( surviving.length !== forms.length ) await actor.setFlag("dragons-and-ballz", "activeForms", surviving);

  // Explicit Technique upkeep.
  const techniques = activeTechniques(actor);
  const techniqueSurvivors = [];
  for ( const active of techniques ) {
    const item = actor.items.get(active.itemId);
    if ( !item ) continue;
    if ( active.amount && !(await spendResource(actor, active.resource ?? "ki", active.amount, { notifyOnFailure: false })) ) {
      await postChat(actor, item.name, `<p>${localize("DBZ.TechniqueEndedNoUpkeep", "Technique ended because its upkeep could not be paid.")}</p>`, { item });
      continue;
    }
    techniqueSurvivors.push(active);
  }
  if ( techniqueSurvivors.length !== techniques.length ) await actor.setFlag("dragons-and-ballz", "activeTechniques", techniqueSurvivors);

  await processPowerOverload(actor, combat);
}

function overloadDamageFormula(amount) {
  if ( amount <= 0 ) return null;
  if ( amount === 1 ) return "2";
  if ( amount === 2 ) return "1d4";
  if ( amount === 3 ) return "1d6";
  if ( amount === 4 ) return "1d8";
  if ( amount === 5 ) return "1d10";
  if ( amount === 6 ) return "1d12";
  return `1d12 + ${(amount - 6)}d6`;
}

export async function processPowerOverload(actor, combat=game.combat) {
  const power = Number(actor.system.attributes?.power?.total ?? actor.system.attributes?.power?.value ?? 0);
  const threshold = Number(actor.system.attributes?.power?.threshold ?? 0);
  const overload = Math.max(0, power - threshold);
  if ( !overload ) return;
  const dc = 10 + power;
  const [roll] = await actor.rollSkill({ skill: "kic" }) ?? [];
  if ( !roll ) return;
  if ( roll.total < dc ) {
    await deactivateAllForms(actor, { reason: localize("DBZ.PowerOverloadFormsEnd", "Power Overload caused all active Forms to end.") });
    await actor.toggleStatusEffect("stunned", { active: true });
    if ( combat ) await actor.setFlag("dragons-and-ballz", "powerOverloadStun", { createdRound: combat.round, createdTurn: combat.turn });
    await postChat(actor, localize("DBZ.PowerOverload", "Power Overload"), `<p>${localize("DBZ.KiControlFailed", "Ki Control failed")} (${roll.total} vs DC ${dc}). ${localize("DBZ.Stunned", "Stunned")}</p>`);
    return;
  }

  const formula = overloadDamageFormula(overload);
  const damageRoll = await postRoll(actor, formula, `${localize("DBZ.PowerOverload", "Power Overload")} — ${localize("DBZ.DestructionDamage", "Destruction Damage")}`);
  const hp = actor.system.attributes?.hp;
  if ( hp ) await actor.update({ "system.attributes.hp.value": Math.max(0, Number(hp.value ?? 0) - Number(damageRoll.total ?? 0)) });
}


/** Handle effects that expire at the end of a combatant's turn. */
export async function processTurnEnd(actor, combat) {
  if ( !actor?.system?.isCharacter ) return;

  const burst = actor.getFlag("dragons-and-ballz", "burstAttack");
  if ( burst ) {
    await actor.setFlag("dragons-and-ballz", "activeForms", burst.previousActiveForms ?? []);
    await actor.unsetFlag("dragons-and-ballz", "burstAttack");
    await postChat(actor, localize("DBZ.BurstAttack", "Burst Attack"), `<p>${localize("DBZ.BurstFormEnded", "The temporary Form from Burst Attack ends.")}</p>`);
  }

  const stun = actor.getFlag("dragons-and-ballz", "powerOverloadStun");
  if ( stun && ((combat.previous?.round ?? combat.round) > Number(stun.createdRound ?? combat.round)) ) {
    await actor.toggleStatusEffect("stunned", { active: false });
    await actor.unsetFlag("dragons-and-ballz", "powerOverloadStun");
  }
}

async function maneuverBlock(actor) {
  if ( !(await spendResource(actor, "stamina", 3)) ) return;
  await setManeuverState(actor, "block", currentTurnStamp());
  await postChat(actor, localize("DBZ.Block", "Block"), `<p>${localize("DBZ.BlockActive", "Damage received is halved until the start of your next turn. Dexterity Saving Throws automatically fail for the duration.")}</p>`);
  return { active: true };
}

async function maneuverWildSense(actor) {
  if ( !(await spendResource(actor, "stamina", 3)) ) return;
  await setManeuverState(actor, "wildSense", currentTurnStamp());
  await postChat(actor, localize("DBZ.WildSense", "Wild Sense"), `<p>${localize("DBZ.WildSenseActive", "Until the start of your next turn, a passed Dexterity Saving Throw avoids all damage and effects. Use the half-damage application on a successful save; Wild Sense converts it to zero damage automatically.")}</p>`);
  return { active: true };
}

async function maneuverBurstAttack(actor) {
  if ( isKiExhausted(actor) ) return notify("warn", localize("DBZ.KiExhaustionBlocksForms", "Ki Exhaustion prevents you from activating Forms."));
  const forms = actor.items.filter(i => i.type === "form");
  if ( !forms.length ) return notify("warn", localize("DBZ.NoFormsAvailable", "No Forms are available."));
  const options = forms.map(i => `<option value="${i.id}">${escapeHTML(i.name)}</option>`).join("");
  const choice = await foundry.applications.api.DialogV2.prompt({
    rejectClose: false,
    content: `<fieldset><legend>${localize("DBZ.BurstAttack", "Burst Attack")}</legend><div class="form-group"><label>${localize("DBZ.Form", "Form")}</label><select name="form">${options}</select></div></fieldset>`,
    window: { title: localize("DBZ.BurstAttack", "Burst Attack") },
    ok: { label: localize("DBZ.Activate", "Activate"), callback: (_e, button) => button.form.elements.form.value }
  });
  if ( !choice ) return;
  const form = actor.items.get(choice);
  const upkeep = formUpkeep(form);
  const half = Math.max(1, Math.ceil(upkeep.amount / 2));
  const required = new Map();
  if ( upkeep.resource === "stamina" ) required.set("stamina", half);
  else {
    required.set("stamina", 1);
    if ( half ) required.set(upkeep.resource, half);
  }
  for ( const [resource, amount] of required ) {
    if ( resourceAvailable(actor, resource) < amount ) return notify("warn", localize("DBZ.NotEnoughResource", `Not enough ${resource}.`));
  }
  for ( const [resource, amount] of required ) await spendResource(actor, resource, amount, { notifyOnFailure: false });

  const previousActiveForms = activeForms(actor).map(i => i.id);
  const slot = formSlot(form);
  const next = activeForms(actor).filter(f => (formSlot(f) !== slot) && !sameFamily(f, form)).map(f => f.id);
  next.push(form.id);
  await actor.setFlag("dragons-and-ballz", "burstAttack", { formId: form.id, previousActiveForms, ...currentTurnStamp() });
  await actor.setFlag("dragons-and-ballz", "activeForms", next);
  await postChat(actor, localize("DBZ.BurstAttack", "Burst Attack"), `<p><strong>${escapeHTML(form.name)}</strong> — ${localize("DBZ.BurstAttackActive", "active until the end of your turn")}</p>`, { item: form });
  return { active: true, form };
}

async function maneuverCounter(actor) {
  const techniques = actor.items.filter(i => i.type === "technique" && !/round|minute|hour/i.test(i.system.castingTime ?? ""));
  if ( !techniques.length ) return notify("warn", localize("DBZ.NoCounterTechniques", "No Technique with a casting time of 1 Action or less is available."));
  const options = techniques.map(i => `<option value="${i.id}">${escapeHTML(i.name)} — ${escapeHTML(i.system.castingTime ?? "")}</option>`).join("");
  const choice = await foundry.applications.api.DialogV2.prompt({
    rejectClose: false,
    content: `<fieldset><legend>${localize("DBZ.Counter", "Counter")}</legend><div class="form-group"><label>${localize("DBZ.Technique", "Technique")}</label><select name="technique">${options}</select></div></fieldset>`,
    window: { title: localize("DBZ.Counter", "Counter") },
    ok: { label: localize("DBZ.Counter", "Counter"), callback: (_e, button) => button.form.elements.technique.value }
  });
  if ( !choice ) return;
  if ( !(await spendResource(actor, "stamina", 5)) ) return;
  return useTechnique(actor.items.get(choice), { counter: true });
}

async function maneuverDeflection(actor) {
  const maxSpend = Math.min(Math.max(1, Number(actor.system.details?.level ?? 1)), resourceAvailable(actor, "stamina"));
  if ( maxSpend < 1 ) return notify("warn", localize("DBZ.NotEnoughResource", "Not enough Stamina."));
  const result = await foundry.applications.api.DialogV2.prompt({
    rejectClose: false,
    content: `<fieldset><legend>${localize("DBZ.Deflection", "Deflection")}</legend>
      <div class="form-group"><label>${localize("DBZ.StaminaSpend", "Stamina to spend")}</label><input type="number" name="stamina" min="1" max="${maxSpend}" value="1"></div>
      <div class="form-group"><label>${localize("DBZ.IncomingDamage", "Incoming damage (optional)")}</label><input type="number" name="damage" min="0" value="0"></div>
      <div class="form-group"><label>${localize("DBZ.ReflectIfZero", "Reflect at half damage if reduced to 0 (+1 Stamina)")}</label><input type="checkbox" name="reflect"></div></fieldset>`,
    window: { title: localize("DBZ.Deflection", "Deflection") },
    ok: { label: localize("DBZ.Deflect", "Deflect"), callback: (_e, button) => ({ stamina: Math.clamp(Number(button.form.elements.stamina.value || 1), 1, maxSpend), damage: Math.max(0, Number(button.form.elements.damage.value || 0)), reflect: !!button.form.elements.reflect.checked }) }
  });
  if ( !result ) return;
  if ( !(await spendResource(actor, "stamina", result.stamina)) ) return;
  const roll = await postRoll(actor, `${result.stamina}d12 + @level`, `${localize("DBZ.Deflection", "Deflection")} — ${localize("DBZ.DamageReduction", "Damage Reduction")}`, { data: { level: Number(actor.system.details?.level ?? 0) } });
  const remaining = result.damage ? Math.max(0, result.damage - Number(roll.total ?? 0)) : null;
  let reflected = 0;
  if ( result.reflect && result.damage && remaining === 0 ) {
    if ( await spendResource(actor, "stamina", 1) ) reflected = Math.floor(result.damage / 2);
  }
  await postChat(actor, localize("DBZ.Deflection", "Deflection"), `<p>${localize("DBZ.DamageReduction", "Damage Reduction")}: <strong>${roll.total}</strong></p>${remaining === null ? "" : `<p>${localize("DBZ.RemainingDamage", "Remaining damage")}: ${remaining}</p>`}${reflected ? `<p>${localize("DBZ.ReflectedDamage", "Reflected damage")}: <strong>${reflected}</strong></p>` : ""}`);
  return { roll, remaining, reflected };
}

async function maneuverInterception(actor) {
  const mode = await foundry.applications.api.DialogV2.prompt({
    rejectClose: false,
    content: `<fieldset><legend>${localize("DBZ.Interception", "Interception")}</legend><div class="form-group"><label>${localize("DBZ.InterceptionMode", "Interception")}</label><select name="mode"><option value="ally">${localize("DBZ.InterceptionAlly", "Protect an ally")}</option><option value="enemy">${localize("DBZ.InterceptionEnemy", "Intercept at the source")}</option></select></div></fieldset>`,
    window: { title: localize("DBZ.Interception", "Interception") },
    ok: { label: localize("DBZ.Intercept", "Intercept"), callback: (_e, button) => button.form.elements.mode.value }
  });
  if ( !mode ) return;
  if ( !(await spendResource(actor, "stamina", 3)) ) return;
  await postChat(actor, localize("DBZ.Interception", "Interception"), `<p>${mode === "ally" ? localize("DBZ.InterceptionAllyEffect", "You become the target and suffer the attack's damage/effects in the ally's place.") : localize("DBZ.InterceptionEnemyEffect", "You place yourself in front of the attack at its source and become its only available target.")}</p><p>${localize("DBZ.InterceptionAutoHit", "Attack Rolls automatically hit you and Dexterity saves to reduce the incoming damage automatically fail for this intercepted attack.")}</p>`);
  return { mode };
}

async function maneuverSpike(actor) {
  const stats = maneuverStats(actor);
  const prof = Math.max(1, Number(actor.system.attributes?.prof ?? 1));
  const maxAttempts = Math.min(prof, Math.floor(resourceAvailable(actor, "stamina") / 2));
  if ( maxAttempts < 1 ) return notify("warn", localize("DBZ.NotEnoughResource", "Not enough Stamina."));
  const attempts = await foundry.applications.api.DialogV2.prompt({
    rejectClose: false,
    content: `<fieldset><legend>${localize("DBZ.SpikeFollowUp", "Spike & Follow Up")}</legend><div class="form-group"><label>${localize("DBZ.SpikeAttempts", "Maximum Spike attempts")}</label><input type="number" name="attempts" min="1" max="${maxAttempts}" value="1"></div></fieldset>`,
    window: { title: localize("DBZ.SpikeFollowUp", "Spike & Follow Up") },
    ok: { label: localize("DBZ.Use", "Use"), callback: (_e, button) => Math.clamp(Number(button.form.elements.attempts.value || 1), 1, maxAttempts) }
  });
  if ( !attempts ) return;
  if ( !(await spendResource(actor, "stamina", attempts * 2)) ) return;
  const target = firstTargetActor();
  const damage = getUnarmedDie(actor);
  for ( let i = 0; i < attempts; i++ ) {
    const dc = Math.max(1, stats.dc - i);
    const save = await rollTargetSave(target, "dex", dc, `${localize("DBZ.Spike", "Spike")} — DC ${dc}`);
    await postDamageRoll(actor, damage, "bludgeoning", `${localize("DBZ.Spike", "Spike")} ${i + 1}/${attempts} — ${localize("DBZ.Damage", "Damage")}`);
    await postChat(actor, localize("DBZ.Spike", "Spike"), `<p>${localize("DBZ.DexSave", "Dexterity Save")}: DC ${dc} · ${localize("DBZ.Launched", "Launched")} 10 ft.${save ? ` · ${localize("DBZ.SaveRoll", "Save")}: ${save.total}` : ""}</p>`);
    if ( save?.isSuccess ) break;
  }
}

async function maneuverPowerStrike(actor) {
  const max = Math.max(0, Math.floor(resourceAvailable(actor, "stamina")));
  if ( max < 1 ) return notify("warn", localize("DBZ.NotEnoughResource", "Not enough Stamina."));
  const spend = await foundry.applications.api.DialogV2.prompt({
    rejectClose: false,
    content: `<fieldset><legend>${localize("DBZ.PowerStrike", "Power Strike")}</legend><div class="form-group"><label>${localize("DBZ.StaminaSpend", "Stamina to spend")}</label><input type="number" name="stamina" min="1" max="${max}" value="1"></div></fieldset>`,
    window: { title: localize("DBZ.PowerStrike", "Power Strike") },
    ok: { label: localize("DBZ.Strike", "Strike"), callback: (_e, button) => Math.clamp(Number(button.form.elements.stamina.value || 1), 1, max) }
  });
  if ( !spend ) return;
  if ( !(await spendResource(actor, "stamina", spend)) ) return;
  const stats = maneuverStats(actor);
  const attack = await postRoll(actor, "1d20 + @bonus", `${localize("DBZ.PowerStrike", "Power Strike")} — ${localize("DBZ.ComboAttack", "Combo Attack")}`, { data: { bonus: stats.attack } });
  const target = firstTargetActor();
  const save = await rollTargetSave(target, "str", stats.dc, `${localize("DBZ.PowerStrike", "Power Strike")} — DC ${stats.dc}`);
  await postChat(actor, localize("DBZ.PowerStrike", "Power Strike"), `<p>${localize("DBZ.ComboAttack", "Combo Attack")}: ${attack.total} · ${localize("DBZ.StrSave", "Strength Save")}: DC ${stats.dc}${save ? ` (${save.total})` : ""}</p><p>${localize("DBZ.Launched", "Launched")}: ${spend * 10} ft. ${localize("DBZ.HalfOnSuccess", "half on a successful save")}</p>`);
  return { attack, save };
}

async function maneuverTagTeam(actor) {
  const lead = firstTargetActor();
  if ( !lead ) return notify("warn", localize("DBZ.TargetChargingAlly", "Target an ally who is Charging a Technique first."));
  const charging = lead.getFlag?.("dragons-and-ballz", "chargingTechnique");
  if ( !charging ) return notify("warn", localize("DBZ.TargetChargingAlly", "Target an ally who is Charging a Technique first."));
  const leadItem = lead.items?.get(charging.itemId);
  if ( !leadItem ) return;
  const choices = actor.items.filter(i => i.type === "technique" && i.system.techniqueType === leadItem.system.techniqueType);
  if ( !choices.length ) return notify("warn", localize("DBZ.NoMatchingTagTechnique", "You do not have a Technique of the same type as the lead Technique."));
  const options = choices.map(i => `<option value="${i.id}">${escapeHTML(i.name)}</option>`).join("");
  const result = await foundry.applications.api.DialogV2.prompt({
    rejectClose: false,
    content: `<fieldset><legend>${localize("DBZ.TagTeamAttack", "Tag Team Attack")}</legend><p>${escapeHTML(lead.name)}: <strong>${escapeHTML(leadItem.name)}</strong></p><div class="form-group"><label>${localize("DBZ.Technique", "Technique")}</label><select name="technique">${options}</select></div></fieldset>`,
    window: { title: localize("DBZ.TagTeamAttack", "Tag Team Attack") },
    ok: { label: localize("DBZ.Join", "Join"), callback: (_e, button) => button.form.elements.technique.value }
  });
  if ( !result ) return;
  const item = actor.items.get(result);
  const cost = parseCost(item.system.kiCost, { description: item.system.description?.value, fallbackResource: "ki" });
  const required = new Map([["stamina", 5]]);
  if ( cost.amount ) required.set(cost.resource, (required.get(cost.resource) ?? 0) + cost.amount);
  for ( const [resource, amount] of required ) if ( resourceAvailable(actor, resource) < amount ) return notify("warn", localize("DBZ.NotEnoughResource", `Not enough ${resource}.`));
  for ( const [resource, amount] of required ) await spendResource(actor, resource, amount, { notifyOnFailure: false });
  await actor.setFlag("dragons-and-ballz", "tagTeam", { leadActorUuid: lead.uuid, leadItemId: leadItem.id, itemId: item.id, ...currentTurnStamp() });
  const concentrating = CONFIG.specialStatusEffects?.CONCENTRATING;
  if ( concentrating ) await actor.toggleStatusEffect(concentrating, { active: true });
  await postChat(actor, localize("DBZ.TagTeamAttack", "Tag Team Attack"), `<p>${localize("DBZ.TagTeamJoined", "Joined the lead Technique")}: <strong>${escapeHTML(leadItem.name)}</strong> + <strong>${escapeHTML(item.name)}</strong></p>`);
  return { lead, leadItem, item };
}

/** Universal Stamina Maneuvers from Chapter 1 of the handbook. */
export async function useManeuver(actor, maneuver) {
  if ( !actor?.isOwner ) return;
  switch ( maneuver ) {
    case "block": return maneuverBlock(actor);
    case "burstAttack": return maneuverBurstAttack(actor);
    case "counter": return maneuverCounter(actor);
    case "deflection": return maneuverDeflection(actor);
    case "interception": return maneuverInterception(actor);
    case "spike": return maneuverSpike(actor);
    case "tagTeam": return maneuverTagTeam(actor);
    case "powerStrike": return maneuverPowerStrike(actor);
    case "wildSense": return maneuverWildSense(actor);
    default: return null;
  }
}

export async function useClash(actor) {
  const own = actor.items.filter(i => i.type === "technique" && !["stance", "otherKi"].includes(i.system.techniqueType));
  if ( !own.length ) return notify("warn", localize("DBZ.NoClashTechniques", "No clash-capable techniques are available."));
  const target = [...game.user.targets][0]?.actor ?? null;
  const enemy = target?.items?.filter(i => i.type === "technique" && !["stance", "otherKi"].includes(i.system.techniqueType)) ?? [];

  const ownOptions = own.map(i => `<option value="${i.id}">${escapeHTML(i.name)} (R${i.system.rank})</option>`).join("");
  const enemyOptions = target ? enemy.map(i => `<option value="${i.id}">${escapeHTML(i.name)} (R${i.system.rank})</option>`).join("") : "";
  const result = await foundry.applications.api.DialogV2.prompt({
    rejectClose: false,
    content: `<fieldset><legend>${localize("DBZ.Clash", "Clash")}</legend><div class="form-group"><label>${localize("DBZ.YourTechnique", "Your Technique")}</label><select name="own">${ownOptions}</select></div>${target ? `<div class="form-group"><label>${escapeHTML(target.name)} — ${localize("DBZ.Technique", "Technique")}</label><select name="enemy">${enemyOptions}</select></div>` : `<div class="form-group"><label>${localize("DBZ.OpposingRank", "Opposing Rank")}</label><input type="number" name="enemyRank" min="0" max="4" value="1"></div>`}</fieldset>`,
    window: { title: localize("DBZ.Clash", "Clash") },
    position: { width: 450 },
    ok: { label: localize("DBZ.Clash", "Clash"), callback: (_e, button) => ({ own: button.form.elements.own.value, enemy: button.form.elements.enemy?.value, enemyRank: Number(button.form.elements.enemyRank?.value ?? 0) }) }
  });
  if ( !result ) return;
  const ownItem = actor.items.get(result.own);
  const enemyItem = target?.items?.get(result.enemy) ?? null;
  if ( enemyItem && techniqueClass(ownItem.system.techniqueType) !== techniqueClass(enemyItem.system.techniqueType) ) {
    return notify("warn", localize("DBZ.ClashTypeMismatch", "Ki Techniques can only clash with Ki Techniques, and Melee/Weapon Techniques with Melee/Weapon Techniques."));
  }

  const staminaCost = /reaction/i.test(ownItem.system.castingTime ?? "") ? 1 : 2;
  const ownCost = parseCost(ownItem.system.kiCost, { description: ownItem.system.description?.value, fallbackResource: "ki" });
  const required = new Map([["stamina", staminaCost]]);
  if ( ownCost.amount ) required.set(ownCost.resource, (required.get(ownCost.resource) ?? 0) + ownCost.amount);
  for ( const [resource, amount] of required ) {
    if ( resourceAvailable(actor, resource) < amount ) {
      notify("warn", localize("DBZ.NotEnoughResource", `Not enough ${resource}.`));
      return;
    }
  }
  for ( const [resource, amount] of required ) {
    if ( !(await spendResource(actor, resource, amount, { notifyOnFailure: false })) ) return;
  }

  const enemyRank = Number(enemyItem?.system.rank ?? result.enemyRank ?? 0);
  const ownRank = Number(ownItem.system.rank ?? 0);
  const ownRankBonus = Math.max(0, ownRank - enemyRank);
  const enemyRankBonus = Math.max(0, enemyRank - ownRank);
  const ownStats = getTechniqueStats(actor, ownItem, { clashRank: ownRankBonus });
  const ownRoll = await postRoll(actor, "1d20 + @bonus", `${localize("DBZ.Clash", "Clash")} — ${ownItem.name}`, { data: { bonus: ownStats.attack } });

  if ( target && enemyItem ) {
    const enemyStats = getTechniqueStats(target, enemyItem, { clashRank: enemyRankBonus });
    const enemyRoll = await postRoll(target, "1d20 + @bonus", `${localize("DBZ.Clash", "Clash")} — ${enemyItem.name}`, { data: { bonus: enemyStats.attack } });
    const winner = ownRoll.total === enemyRoll.total ? localize("DBZ.ClashTie", "Tie") : ownRoll.total > enemyRoll.total ? actor.name : target.name;
    await postChat(actor, localize("DBZ.ClashResult", "Clash Result"), `<p><strong>${escapeHTML(winner)}</strong></p><p>${escapeHTML(actor.name)}: ${ownRoll.total} · ${escapeHTML(target.name)}: ${enemyRoll.total}</p>`);
    return { ownRoll, enemyRoll, winner };
  }
  await postChat(actor, localize("DBZ.Clash", "Clash"), `<p>${localize("DBZ.ClashRollReady", "Clash roll created. Compare it with the opposing roll.")}</p><p>${localize("DBZ.OpposingRank", "Opposing Rank")}: ${enemyRank}</p>`);
  return { ownRoll };
}


/**
 * Sense Ki using the handbook's Wisdom (Perception) check and narrative range by Ki Rank.
 * Foundry can only enumerate tokens in the current Scene; wider-range results remain GM/narrative information.
 */
export async function senseKi(actor) {
  if ( !hasActorItem(actor, "ki control") ) {
    notify("warn", localize("DBZ.KiSenseRequiresControl", "Ki Control is required to Sense Ki."));
    return;
  }
  const ranks = { 1: "Continent", 2: "Planet", 3: "Solar System", 4: "Galaxy" };
  const rank = getKiRank(actor);
  const range = ranks[rank] ?? ranks[1];
  const [roll] = await actor.rollSkill({ skill: "prc" }) ?? [];
  if ( !roll ) return;

  const sensed = [];
  for ( const token of canvas?.tokens?.placeables ?? [] ) {
    const target = token.actor;
    if ( !target || target.id === actor.id ) continue;
    const mechanical = target.items?.some(i => /^(android|cyborg)$/i.test(i.name?.trim?.() ?? ""));
    const construct = ["construct"].includes(target.system?.details?.type?.value ?? target.system?.details?.type);
    if ( mechanical || construct ) continue;

    const conceal = target.getFlag?.("dragons-and-ballz", "concealKi") ?? null;
    if ( conceal && (roll.total < Number(conceal.dc ?? Infinity)) ) continue;
    const powerLevel = conceal?.powerLevel ?? target.system?.attributes?.powerLevel ?? "?";
    sensed.push({ name: target.name, powerLevel });
  }

  const list = sensed.length
    ? `<ol>${sensed.map(t => `<li><strong>${escapeHTML(t.name)}</strong> — ${localize("DBZ.PowerLevel", "Power Level")}: ${escapeHTML(t.powerLevel)}</li>`).join("")}</ol>`
    : `<p>${localize("DBZ.NoKiSignaturesSensed", "No Ki signatures were sensed in the current Scene.")}</p>`;
  await postChat(actor, localize("DBZ.SenseKi", "Sense Ki"),
    `<p>${localize("DBZ.KiSenseRange", "Narrative range")}: <strong>${escapeHTML(range)}</strong> · ${localize("DBZ.KiRank", "Ki Rank")} ${rank}</p>`
    + `<p>${localize("DBZ.KiSenseRoll", "Sense Ki check")}: <strong>${roll.total}</strong></p>${list}`);
  return { roll, range, sensed };
}

/** Toggle Conceal Ki. The Ki Control roll becomes the DC and an optional lower apparent Power Level can be stored. */
export async function concealKi(actor) {
  if ( !hasActorItem(actor, "ki control") ) {
    notify("warn", localize("DBZ.KiSenseRequiresControl", "Ki Control is required to Conceal Ki."));
    return;
  }
  const current = actor.getFlag("dragons-and-ballz", "concealKi");
  if ( current ) {
    await actor.unsetFlag("dragons-and-ballz", "concealKi");
    await postChat(actor, localize("DBZ.ConcealKi", "Conceal Ki"), `<p>${localize("DBZ.ConcealKiEnded", "Ki is no longer concealed.")}</p>`);
    return { active: false };
  }

  const [roll] = await actor.rollSkill({ skill: "kic" }) ?? [];
  if ( !roll ) return;
  const actual = Math.max(0, Number(actor.system.attributes?.powerLevel ?? 0));
  const chosen = await foundry.applications.api.DialogV2.prompt({
    rejectClose: false,
    content: `<fieldset><legend>${localize("DBZ.ConcealKi", "Conceal Ki")}</legend><p>${localize("DBZ.ConcealKiDC", "Detection DC")}: <strong>${roll.total}</strong></p><div class="form-group"><label>${localize("DBZ.ApparentPowerLevel", "Apparent Power Level")}</label><input type="number" name="powerLevel" min="0" max="${actual}" step="1" value="${actual}"></div></fieldset>`,
    window: { title: localize("DBZ.ConcealKi", "Conceal Ki") },
    position: { width: 420 },
    ok: {
      label: localize("DBZ.Confirm", "Confirm"),
      callback: (_event, button) => Math.clamp(Number(button.form.elements.powerLevel.value || 0), 0, actual)
    }
  });
  if ( chosen === null ) return;
  await actor.setFlag("dragons-and-ballz", "concealKi", { dc: roll.total, powerLevel: chosen });
  await postChat(actor, localize("DBZ.ConcealKi", "Conceal Ki"), `<p>${localize("DBZ.ConcealKiActive", "Ki concealed")} · DC ${roll.total} · ${localize("DBZ.ApparentPowerLevel", "Apparent Power Level")}: ${chosen}</p>`);
  return { active: true, dc: roll.total, powerLevel: chosen };
}

export function getFormSummary(actor, item) {
  const active = activeForms(actor).some(f => f.id === item.id);
  const upkeep = formUpkeep(item);
  return {
    active,
    subtitle: `${localize(`DBZ.ITEM.FormCategories.${item.system.category}`, item.system.category)} · ${localize("DBZ.Upkeep", "Upkeep")} ${upkeep.amount || "—"} ${upkeep.resource} · ${localize("DBZ.Power", "Power")} ${Number(item.system.powerBonus ?? 0) >= 0 ? "+" : ""}${Number(item.system.powerBonus ?? 0)}`
  };
}

export function getTechniqueSummary(actor, item) {
  const stats = getTechniqueStats(actor, item);
  const cost = parseCost(item.system.kiCost, { description: item.system.description?.value, fallbackResource: "ki" });
  return {
    stats,
    subtitle: `${localize(`DBZ.ITEM.TechniqueTypes.${item.system.techniqueType}`, item.system.techniqueType)} · R${item.system.rank || "S"} · ${cost.original || `${cost.amount} ${cost.resource}`} · ${localize("DBZ.AttackBonus", "Attack")} ${stats.attack >= 0 ? "+" : ""}${stats.attack} / DC ${stats.dc}`
  };
}

/**
 * Run a non-destructive Foundry runtime diagnostic for the final system release.
 * Available as `game.dnd5e.dragonball.runDiagnostics(actor)` in the browser console.
 */
export async function runDiagnostics(actor=null) {
  const checks = [];
  const add = (name, ok, detail="") => checks.push({ name, ok: !!ok, detail: String(detail ?? "") });

  add("System ID", game.system?.id === "dragons-and-ballz", game.system?.id);
  add("Foundry generation", Number(game.release?.generation ?? 0) >= 14, game.version ?? game.release?.version ?? "?");
  for ( const type of ["form", "technique", "training", "subrace"] ) {
    add(`Item DataModel: ${type}`, !!CONFIG.Item?.dataModels?.[type], CONFIG.Item?.dataModels?.[type]?.name ?? "missing");
  }

  const expectedPacks = ["races", "backgrounds", "classes", "features-training", "forms", "techniques", "equipment"];
  for ( const name of expectedPacks ) {
    const pack = game.packs?.get(`dragons-and-ballz.${name}`) ?? [...(game.packs ?? [])].find(p => p.metadata?.name === name);
    if ( !pack ) { add(`Compendium: ${name}`, false, "missing"); continue; }
    try {
      const index = await pack.getIndex();
      add(`Compendium: ${name}`, index.size > 0, `${index.size} entries`);
    } catch ( err ) {
      add(`Compendium: ${name}`, false, err.message);
    }
  }

  actor ??= canvas?.tokens?.controlled?.[0]?.actor ?? game.user?.character ?? null;
  if ( actor ) {
    const attrs = actor.system?.attributes ?? {};
    add("Character resources", !!attrs.ki && !!attrs.stamina && !!attrs.godKi && !!attrs.power,
      `${actor.name}: Ki ${attrs.ki?.value ?? "?"}, Stamina ${attrs.stamina?.value ?? "?"}`);
    add("DBZ skills", ["spi", "kic", "tec"].every(k => !!actor.system?.skills?.[k]), "Spirit / Ki Control / Technology");
    const invalidForms = (actor.getFlag?.("dragons-and-ballz", "activeForms") ?? []).filter(id => actor.items?.get(id)?.type !== "form");
    add("Active Form references", invalidForms.length === 0, invalidForms.length ? `${invalidForms.length} invalid` : "ok");
  } else add("Character smoke check", true, "skipped (no controlled/user character)");

  const failed = checks.filter(c => !c.ok);
  console.group(`Dragons and BallZ ${game.system?.version ?? "?"} diagnostics`);
  console.table(checks);
  console.groupEnd();
  if ( failed.length ) notify("warn", localize("DBZ.DiagnosticsFailed", `${failed.length} diagnostic checks failed. See console.`));
  else notify("info", localize("DBZ.DiagnosticsPassed", "Dragons and BallZ diagnostics passed."));
  return { ok: failed.length === 0, checks };
}

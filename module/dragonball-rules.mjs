/**
 * Pure Dragons and BallZ rule helpers.
 *
 * This module deliberately has no Foundry globals so it can be covered by Node tests.
 */

/** Convert the small subset of HTML/entities used by handbook descriptions into searchable text. */
export function handbookText(html="") {
  return String(html)
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&gt;/gi, ">")
    .replace(/&lt;/gi, "<")
    .replace(/&times;/gi, "×")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse only deterministic, additive Form bonuses that are stated explicitly in the handbook.
 * Free-form or conditional effects remain descriptive and are intentionally not guessed.
 */
export function parseFormBonuses(html="") {
  const text = handbookText(html);
  const bonuses = {
    ac: 0,
    movementFlat: 0,
    movementMultiplier: 1,
    damageDieSteps: 0,
    damage: [],
    extraAttacks: 0
  };

  const acPatterns = [
    /\+(\d+)\s+to\s+(?:your\s+)?AC\b/i,
    /(?:your\s+)?AC\s+(?:increases?|is increased)\s+by\s+(\d+)\b/i
  ];
  for ( const pattern of acPatterns ) {
    const match = text.match(pattern);
    if ( match ) { bonuses.ac = Number(match[1]); break; }
  }

  const movement = text.match(/Increase\s+all\s+Movement\s+Speeds?\s+by\s+(\d+)\s*(?:ft\.?|feet)?/i);
  if ( movement ) bonuses.movementFlat = Number(movement[1]);

  const multiplierWords = { double: 2, triple: 3, quadruple: 4, quintuple: 5 };
  const multiplier = text.match(/\b(Double|Triple|Quadruple|Quintuple)\s+(?:your\s+)?(?:Walk(?:ing)?(?:\s+and\s+Fly)?|Movement)\s+Speed/i);
  if ( multiplier ) bonuses.movementMultiplier = multiplierWords[multiplier[1].toLowerCase()] ?? 1;

  const dieSteps = text.match(/Increase\s+all\s+Damage\s+Die\s+(?:step\s+by\s+(\d+)|by\s+(\d+)\s+steps?)/i);
  if ( dieSteps ) bonuses.damageDieSteps = Number(dieSteps[1] ?? dieSteps[2] ?? 0);

  const damagePattern = /(?:You\s+)?deal\s+\+(\d+d\d+(?:\s*[+\-]\s*\d+)?)\s+to\s+all\s+Damage\s+Rolls/gi;
  for ( const match of text.matchAll(damagePattern) ) {
    const formula = match[1].replace(/\s+/g, "");
    if ( !bonuses.damage.includes(formula) ) bonuses.damage.push(formula);
  }

  const extraAttack = text.match(/(?:make|gain)\s+(?:an\s+)?additional\s+(?:(\d+)\s+)?attacks?\s+as\s+part\s+of\s+(?:the\s+)?(?:Attack|Ki\s+Blast)\s+Action/i);
  if ( extraAttack ) bonuses.extraAttacks = Number(extraAttack[1] ?? 1);

  return bonuses;
}

/** Aggregate deterministic bonuses from a list of Form-like objects. */
export function aggregateFormBonuses(forms=[]) {
  const total = { ac: 0, movementFlat: 0, movementMultiplier: 1, damageDieSteps: 0, damage: [], extraAttacks: 0 };
  for ( const form of forms ) {
    const parsed = parseFormBonuses(form?.system?.description?.value ?? form?.description ?? "");
    total.ac += parsed.ac;
    total.movementFlat += parsed.movementFlat;
    total.movementMultiplier *= parsed.movementMultiplier;
    total.damageDieSteps += parsed.damageDieSteps;
    total.extraAttacks += parsed.extraAttacks;
    for ( const formula of parsed.damage ) total.damage.push(formula);
  }
  return total;
}

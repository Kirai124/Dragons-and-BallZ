import { DBZ } from "../../config.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * Charakterbogen für Spielercharaktere.
 * GRUNDGERÜST - wird Schritt für Schritt um Rassen, Werte, Techniken etc.
 * erweitert, sobald das Regelwerk final ausgewertet wurde.
 */
export default class CharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["dragons-and-ballz", "sheet", "actor", "character"],
    position: {
      width: 700,
      height: 620
    },
    window: {
      resizable: true
    },
    form: {
      submitOnChange: true
    }
  };

  /** @override */
  static PARTS = {
    sheet: {
      template: "systems/dragons-and-ballz/templates/actors/character-sheet.hbs"
    }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.actor.system;

    context.actor = this.actor;
    context.system = system;
    context.source = this.actor.toObject().system;

    // Attribute als Liste fürs Template, inkl. Label/Abkürzung aus der Config
    context.abilities = Object.entries(DBZ.abilities).map(([key, label]) => ({
      key,
      label,
      abbr: DBZ.abilityAbbreviations[key],
      ...system.abilities[key]
    }));

    // Skills als Liste fürs Template, inkl. Label + Attributs-Abkürzung
    context.skills = Object.entries(DBZ.skills).map(([key, config]) => {
      const skill = system.skills[key];
      return {
        key,
        label: config.label,
        abilityAbbr: DBZ.abilityAbbreviations[config.ability],
        isNone: skill.value === 0,
        isProficient: skill.value === 1,
        isExpert: skill.value === 2,
        ...skill
      };
    }).sort((a, b) => game.i18n.localize(a.label).localeCompare(game.i18n.localize(b.label)));

    context.alignments = DBZ.alignments;

    return context;
  }
}

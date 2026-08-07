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
    context.actor = this.actor;
    context.system = this.actor.system;
    context.source = this.actor.toObject().system;
    return context;
  }
}

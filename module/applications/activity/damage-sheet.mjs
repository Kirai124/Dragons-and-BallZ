import ActivitySheet from "./activity-sheet.mjs";

/**
 * Sheet for the damage activity.
 */
export default class DamageSheet extends ActivitySheet {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["damage-activity"]
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    effect: {
      template: "systems/dragons-and-ballz/templates/activity/damage-effect.hbs",
      templates: [
        ...super.PARTS.effect.templates,
        "systems/dragons-and-ballz/templates/activity/parts/damage-damage.hbs",
        "systems/dragons-and-ballz/templates/activity/parts/damage-part.hbs",
        "systems/dragons-and-ballz/templates/activity/parts/damage-parts.hbs"
      ]
    }
  };
}

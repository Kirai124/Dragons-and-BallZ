import ItemDataModel from "../abstract/item-data-model.mjs";
import AdvancementTemplate from "./templates/advancement.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";

const { StringField } = foundry.data.fields;

/**
 * Dragons and BallZ subrace/lineage item.
 * Kept separate from D&D subclasses so ancestry progression can be granted with normal advancements.
 */
export default class SubraceData extends ItemDataModel.mixin(AdvancementTemplate, ItemDescriptionTemplate) {
  static LOCALIZATION_PREFIXES = ["DBZ.ITEM.Subrace", "DND5E.SOURCE"];

  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      parentRace: new StringField({ required: true, nullable: false, initial: "", label: "DBZ.ITEM.ParentRace" }),
      requirements: new StringField({ required: true, nullable: false, initial: "", label: "DBZ.ITEM.Requirements" }),
      tags: new StringField({ required: true, nullable: false, initial: "", label: "DBZ.ITEM.Tags" })
    });
  }

  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    hasEffects: true
  }, { inplace: false }));

  prepareDerivedData() {
    super.prepareDerivedData();
    this.prepareDescriptionData();
  }

  get cardProperties() {
    const properties = [];
    if ( this.parentRace ) properties.push({ type: "text", text: `${_loc("DBZ.ITEM.ParentRace")}: ${this.parentRace}` });
    if ( this.requirements ) properties.push({ type: "text", text: this.requirements });
    return properties;
  }

  async getSheetData(context) {
    context.subtitles = [{ label: _loc(CONFIG.Item.typeLabels.subrace) }];
    context.singleDescription = true;
    context.parts = ["dnd5e.details-dbz-subrace"];
  }
}

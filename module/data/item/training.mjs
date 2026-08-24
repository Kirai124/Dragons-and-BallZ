import ItemDataModel from "../abstract/item-data-model.mjs";
import AdvancementTemplate from "./templates/advancement.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";

const { NumberField, StringField } = foundry.data.fields;

/** Data model for Training Arcs, Training Boons, Ordeals, and Trained Features. */
export default class TrainingData extends ItemDataModel.mixin(AdvancementTemplate, ItemDescriptionTemplate) {
  static LOCALIZATION_PREFIXES = ["DBZ.ITEM.Training", "DND5E.SOURCE"];

  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      category: new StringField({ required: true, nullable: false, initial: "boon", label: "DBZ.ITEM.TrainingCategory" }),
      boonCost: new NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 1, label: "DBZ.ITEM.BoonCost" }),
      durationWeeks: new NumberField({ required: true, nullable: false, min: 0, initial: 0, label: "DBZ.ITEM.DurationWeeks" }),
      kiRank: new NumberField({ nullable: true, integer: true, min: 1, max: 4, initial: null, label: "DBZ.ITEM.KiRankRequirement" }),
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
    const properties = [
      { type: "text", text: _loc(`DBZ.ITEM.TrainingCategories.${this.category}`) }
    ];
    if ( this.boonCost ) properties.push({ type: "text", text: `${this.boonCost} ${_loc("DBZ.ITEM.TrainingBoons")}` });
    if ( this.kiRank ) properties.push({ type: "text", text: `${_loc("DBZ.ITEM.KiRank")}: ${this.kiRank}` });
    if ( this.requirements ) properties.push({ type: "text", text: this.requirements });
    return properties;
  }

  async getSheetData(context) {
    context.subtitles = [
      { label: _loc(CONFIG.Item.typeLabels.training) },
      { label: _loc(`DBZ.ITEM.TrainingCategories.${this.category}`) }
    ];
    context.singleDescription = true;
    context.parts = ["dnd5e.details-dbz-training"];
    context.trainingCategories = {
      arc: "DBZ.ITEM.TrainingCategories.arc",
      boon: "DBZ.ITEM.TrainingCategories.boon",
      ordeal: "DBZ.ITEM.TrainingCategories.ordeal",
      trainedFeature: "DBZ.ITEM.TrainingCategories.trainedFeature"
    };
  }
}

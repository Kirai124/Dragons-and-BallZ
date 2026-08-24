import ItemDataModel from "../abstract/item-data-model.mjs";
import ActivitiesTemplate from "./templates/activities.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";

const { BooleanField, NumberField, StringField } = foundry.data.fields;

/** Data model for Transformations, Power-Ups, and Combination Forms. */
export default class FormData extends ItemDataModel.mixin(ActivitiesTemplate, ItemDescriptionTemplate) {
  static LOCALIZATION_PREFIXES = ["DBZ.ITEM.Form", "DND5E.SOURCE"];

  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      category: new StringField({ required: true, nullable: false, initial: "transformation", label: "DBZ.ITEM.FormCategory" }),
      rank: new NumberField({ nullable: true, integer: true, min: 1, max: 4, initial: null, label: "DBZ.ITEM.KiRank" }),
      family: new StringField({ required: true, nullable: false, initial: "", label: "DBZ.ITEM.FormFamily" }),
      resource: new StringField({ required: true, nullable: false, initial: "stamina", label: "DBZ.ITEM.Resource" }),
      activationCost: new StringField({ required: true, nullable: false, initial: "", label: "DBZ.ITEM.ActivationCost" }),
      upkeepCost: new StringField({ required: true, nullable: false, initial: "", label: "DBZ.ITEM.UpkeepCost" }),
      activation: new StringField({ required: true, nullable: false, initial: "action", label: "DBZ.ITEM.Activation" }),
      powerBonus: new NumberField({ required: true, nullable: false, integer: true, initial: 0, label: "DBZ.ITEM.PowerBonus" }),
      berserker: new BooleanField({ required: true, nullable: false, initial: false, label: "DBZ.ITEM.BerserkerForm" }),
      berserkDC: new NumberField({ nullable: true, integer: true, min: 1, initial: null, label: "DBZ.ITEM.BerserkDC" }),
      godly: new BooleanField({ required: true, nullable: false, initial: false, label: "DBZ.ITEM.GodlyForm" }),
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

  prepareFinalData() {
    this.prepareFinalActivityData(this.parent.getRollData({ deterministic: true }));
  }

  get cardProperties() {
    const properties = [
      { type: "text", text: _loc(`DBZ.ITEM.FormCategories.${this.category}`) }
    ];
    if ( this.family ) properties.push({ type: "text", text: `${_loc("DBZ.ITEM.FormFamily")}: ${this.family}` });
    if ( this.rank ) properties.push({ type: "text", text: `${_loc("DBZ.ITEM.KiRank")}: ${this.rank}` });
    if ( this.upkeepCost ) properties.push({ type: "text", text: `${_loc("DBZ.ITEM.UpkeepCost")}: ${this.upkeepCost}` });
    if ( this.powerBonus ) properties.push({ type: "text", text: `${_loc("DBZ.ITEM.PowerBonus")}: ${this.powerBonus >= 0 ? "+" : ""}${this.powerBonus}` });
    if ( this.godly ) properties.push({ type: "text", text: _loc("DBZ.ITEM.GodlyForm") });
    if ( this.berserker ) properties.push({ type: "text", text: _loc("DBZ.ITEM.BerserkerForm") });
    return properties;
  }

  async getSheetData(context) {
    context.subtitles = [
      { label: _loc(CONFIG.Item.typeLabels.form) },
      { label: _loc(`DBZ.ITEM.FormCategories.${this.category}`) }
    ];
    context.parts = ["dnd5e.details-dbz-form", "dnd5e.field-uses"];
    context.formCategories = {
      transformation: "DBZ.ITEM.FormCategories.transformation",
      powerUp: "DBZ.ITEM.FormCategories.powerUp",
      combinationTransformation: "DBZ.ITEM.FormCategories.combinationTransformation",
      combinationPowerUp: "DBZ.ITEM.FormCategories.combinationPowerUp"
    };
    context.formResources = {
      stamina: "DBZ.Stamina",
      ki: "DBZ.Ki",
      godKi: "DBZ.GodKi",
      other: "DBZ.ITEM.OtherResource"
    };
    context.formActivations = {
      action: "DND5E.Action",
      bonus: "DND5E.BonusAction",
      reaction: "DND5E.Reaction",
      special: "DBZ.ITEM.Special"
    };
  }
}

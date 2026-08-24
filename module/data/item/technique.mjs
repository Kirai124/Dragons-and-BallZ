import ItemDataModel from "../abstract/item-data-model.mjs";
import ActivitiesTemplate from "./templates/activities.mjs";
import ItemDescriptionTemplate from "./templates/item-description.mjs";

const { BooleanField, NumberField, StringField } = foundry.data.fields;

/** Data model for Dragons and BallZ Techniques. */
export default class TechniqueData extends ItemDataModel.mixin(ActivitiesTemplate, ItemDescriptionTemplate) {
  static LOCALIZATION_PREFIXES = ["DBZ.ITEM.Technique", "DND5E.SOURCE"];

  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      rank: new NumberField({ required: true, nullable: false, integer: true, min: 0, max: 4, initial: 1, label: "DBZ.ITEM.KiRank" }),
      techniqueType: new StringField({ required: true, nullable: false, initial: "melee", label: "DBZ.ITEM.TechniqueType" }),
      kiCost: new StringField({ required: true, nullable: false, initial: "0", label: "DBZ.ITEM.KiCost" }),
      castingTime: new StringField({ required: true, nullable: false, initial: "1 Action", label: "DBZ.ITEM.CastingTime" }),
      range: new StringField({ required: true, nullable: false, initial: "Melee", label: "DBZ.ITEM.Range" }),
      duration: new StringField({ required: true, nullable: false, initial: "Instantaneous", label: "DBZ.ITEM.Duration" }),
      chargeable: new BooleanField({ required: true, nullable: false, initial: false, label: "DBZ.ITEM.Chargeable" }),
      mastery: new NumberField({ required: true, nullable: false, integer: true, min: 0, max: 3, initial: 0, label: "DBZ.ITEM.Mastery" }),
      staticBonus: new NumberField({ required: true, nullable: false, integer: true, initial: 0, label: "DBZ.ITEM.StaticBonus" }),
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

  get abilityMod() {
    return ({
      blast: "wis", beam: "con", barrage: "dex", omni: "int", melee: "str", weapon: "str"
    })[this.techniqueType] ?? null;
  }

  get cardProperties() {
    const rankLabel = this.rank === 0 ? _loc("DBZ.ITEM.Special") : `${_loc("DBZ.ITEM.KiRank")} ${this.rank}`;
    const properties = [
      { type: "text", text: rankLabel },
      { type: "text", text: _loc(`DBZ.ITEM.TechniqueTypes.${this.techniqueType}`) },
      { type: "text", text: `${_loc("DBZ.ITEM.KiCost")}: ${this.kiCost}` },
      { type: "text", text: `${_loc("DBZ.ITEM.Mastery")}: ${this.mastery}/3` }
    ];
    if ( this.chargeable ) properties.push({ type: "text", text: _loc("DBZ.ITEM.Chargeable") });
    if ( this.staticBonus ) properties.push({ type: "text", text: `${_loc("DBZ.ITEM.StaticBonus")}: ${this.staticBonus >= 0 ? "+" : ""}${this.staticBonus}` });
    return properties;
  }

  async getSheetData(context) {
    context.subtitles = [
      { label: _loc(CONFIG.Item.typeLabels.technique) },
      { label: this.rank === 0 ? _loc("DBZ.ITEM.Special") : `${_loc("DBZ.ITEM.KiRank")} ${this.rank}` },
      { label: _loc(`DBZ.ITEM.TechniqueTypes.${this.techniqueType}`) }
    ];
    context.parts = ["dnd5e.details-dbz-technique", "dnd5e.field-uses"];
    context.techniqueTypes = {
      melee: "DBZ.ITEM.TechniqueTypes.melee",
      weapon: "DBZ.ITEM.TechniqueTypes.weapon",
      blast: "DBZ.ITEM.TechniqueTypes.blast",
      beam: "DBZ.ITEM.TechniqueTypes.beam",
      barrage: "DBZ.ITEM.TechniqueTypes.barrage",
      omni: "DBZ.ITEM.TechniqueTypes.omni",
      otherKi: "DBZ.ITEM.TechniqueTypes.otherKi",
      stance: "DBZ.ITEM.TechniqueTypes.stance"
    };
  }
}

const { StringField, NumberField, BooleanField } = foundry.data.fields;

/**
 * DataModel für Race-/Subrace-Items.
 *
 * Komplexe Regelwerksdaten (ASI-Choices, Sprachen, Features) werden als
 * JSON-Strings gespeichert. Die generierte Registry in races.mjs ist die
 * kanonische Quelle und kann mit scripts/parse-races.mjs neu erzeugt werden.
 */
export default class RaceData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      sourceId: new StringField({ required: true, blank: true, initial: "" }),
      category: new StringField({ required: true, blank: true, initial: "Alien" }),
      subrace: new BooleanField({ required: true, initial: false }),
      parent: new StringField({ required: true, blank: true, initial: "" }),
      replacementLimit: new NumberField({ required: true, integer: true, min: 0, initial: 3 }),
      description: new StringField({ required: false, blank: true, initial: "" }),
      abilityBonuses: new StringField({ required: true, blank: true, initial: "{}" }),
      speed: new NumberField({ required: false, nullable: true, min: 0, initial: null }),
      languages: new StringField({ required: true, blank: true, initial: "" }),
      skills: new StringField({ required: true, blank: true, initial: "[]" }),
      skillChoiceCount: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      lockedFeatures: new StringField({ required: true, blank: true, initial: "[]" }),
      features: new StringField({ required: true, blank: true, initial: "[]" }),
      sourceText: new StringField({ required: false, blank: true, initial: "" })
    };
  }
}

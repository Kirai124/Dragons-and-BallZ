import { DBZ } from "../../config.mjs";

const { StringField, NumberField, SchemaField, BooleanField, HTMLField } = foundry.data.fields;

/**
 * Ein einzelnes Attribut (Ability Score) samt Maximum und
 * Rettungswurf-Proficiency.
 * @param {number} initial  Startwert des Attributs.
 */
function abilityField(initial = 10) {
  return new SchemaField({
    value: new NumberField({ required: true, integer: true, min: 1, initial, label: "DBZ.AbilityScore" }),
    max: new NumberField({ required: true, integer: true, initial: 20, label: "DBZ.AbilityScoreMax" }),
    proficient: new BooleanField({ required: true, initial: false, label: "DBZ.SavingThrowProficiency" })
  });
}

/**
 * Ein einzelner Skill. value: 0 = nicht geübt, 1 = geübt (Proficiency),
 * 2 = Expertise (doppelte Proficiency), siehe z.B. "Earthling: Master of Many".
 */
function skillField() {
  return new SchemaField({
    value: new NumberField({ required: true, integer: true, initial: 0, min: 0, max: 2, label: "DBZ.SkillProficiency" })
  });
}

/**
 * Eine Ressource mit aktuellem Wert, Maximum und optional Temp-Wert.
 * Stamina, Ki: siehe Kapitel 1. God Ki gesondert (kein "temp").
 */
function resourceField({ initial = 0, temp = true } = {}) {
  const schema = {
    value: new NumberField({ required: true, integer: true, initial, min: 0 }),
    max: new NumberField({ required: true, integer: true, initial, min: 0 })
  };
  if (temp) schema.temp = new NumberField({ required: true, integer: true, initial: 0, min: 0 });
  return new SchemaField(schema);
}

/**
 * Data model für Spielercharaktere in Dragons and BallZ.
 *
 * Deckt die Basissysteme aus Kapitel 1 des Regelwerks ab: Attribute,
 * Stamina, Ki, God Ki, Power, Ki-Rang, die 3 neuen Skills sowie das
 * eigene Proficiency-Bonus-Schema. Rassen-/Klassen-/Techniken-Werte
 * (Items) folgen in späteren Schritten und werden hier per Active
 * Effects/Item-Daten einwirken, sobald diese Item-Typen existieren.
 */
export default class CharacterData extends foundry.abstract.TypeDataModel {

  /** @override */
  static defineSchema() {
    const schema = {};

    // -------------------------------------------------------------
    // Attribute (Strength, Dexterity, Constitution, Intelligence,
    // Wisdom, Charisma) - Kapitel 2: "Determining Your Ability Scores"
    // -------------------------------------------------------------
    schema.abilities = new SchemaField({
      str: abilityField(10),
      dex: abilityField(10),
      con: abilityField(10),
      int: abilityField(10),
      wis: abilityField(10),
      cha: abilityField(10)
    });

    // -------------------------------------------------------------
    // Ressourcen & Kampfwerte
    // -------------------------------------------------------------
    schema.attributes = new SchemaField({
      hp: resourceField({ initial: 10 }),
      // Stamina: 1 + Konstitution-Modifikator auf Level 1, +1 pro Level-Up
      stamina: resourceField({ initial: 1 }),
      // Ki: Konstitution-Mod + Weisheits-Mod + Klassen-Ki-Modifikator pro Level
      ki: resourceField({ initial: 0 }),
      // God Ki: max 3, kein Temp-Wert, siehe "God Ki" Kapitel 1
      godki: resourceField({ initial: 0, temp: false }),
      // Power: kann negativ sein (siehe "Power" Kapitel 1)
      power: new SchemaField({
        value: new NumberField({ required: true, integer: true, initial: 0 })
      }),
      // AC ist je nach Klasse unterschiedlich berechnet (Unarmored Defense
      // Varianten). Bis Klassen-Items existieren, bleibt dies ein manuell
      // gesetzter Wert mit sinnvollem Default (10 + Dex).
      ac: new SchemaField({
        value: new NumberField({ required: true, integer: true, initial: 10 })
      }),
      movement: new SchemaField({
        walk: new NumberField({ required: true, integer: true, initial: 30, min: 0 }),
        fly: new NumberField({ required: true, integer: true, initial: 0, min: 0 }),
        swim: new NumberField({ required: true, integer: true, initial: 0, min: 0 })
      }),
      // Provisorisch bis Klassen-Items mit echten Class-Level existieren.
      level: new NumberField({ required: true, integer: true, initial: 1, min: 1, max: 20 }),
      hitdie: new StringField({ required: true, initial: "d8" })
    });

    // -------------------------------------------------------------
    // Skills: 18 Standard-Skills + Spirit, Ki Control, Technology
    // -------------------------------------------------------------
    schema.skills = new SchemaField(
      Object.keys(DBZ.skills).reduce((obj, key) => {
        obj[key] = skillField();
        return obj;
      }, {})
    );

    // -------------------------------------------------------------
    // Details
    // -------------------------------------------------------------
    schema.details = new SchemaField({
      race: new StringField({ required: false, blank: true, initial: "" }),
      background: new StringField({ required: false, blank: true, initial: "" }),
      alignment: new StringField({ required: false, blank: true, initial: "" }),
      xp: new SchemaField({
        value: new NumberField({ required: true, integer: true, initial: 0, min: 0 })
      }),
      zeni: new SchemaField({
        value: new NumberField({ required: true, integer: true, initial: 0, min: 0 })
      })
    });

    schema.notes = new HTMLField({ required: false, blank: true, initial: "" });

    return schema;
  }

  /* -------------------------------------------- */
  /*  Derived Data                                 */
  /* -------------------------------------------- */

  /** @override */
  prepareDerivedData() {
    this._prepareAbilities();
    this._prepareProficiencyAndRank();
    this._prepareSkills();
    this._preparePowerLevel();
  }

  /**
   * Modifikatoren und Rettungswürfe für alle 6 Attribute.
   * Standard-5e-Formel, siehe "Ability Scores And Modifiers"-Tabelle
   * in Kapitel 2 (deckungsgleich mit floor((score-10)/2)).
   */
  _prepareAbilities() {
    const prof = this.attributes.prof ?? 0;
    for (const key of Object.keys(this.abilities)) {
      const ability = this.abilities[key];
      ability.mod = Math.floor((ability.value - 10) / 2);
      // "Bonus zu allen Saving Throws ohne Proficiency = halber Proficiency Bonus"
      ability.saveBonus = ability.proficient ? prof : Math.floor(prof / 2);
      ability.save = ability.mod + ability.saveBonus;
    }
  }

  /**
   * Eigenes Proficiency-Bonus-Schema (Kapitel 2: "Character Advancement"):
   * +3 auf Level 1-3, +4 auf 4-6, +5 auf 7-9, +6 auf 10-12, +7 auf 13-15,
   * +8 auf 16-18, +9 auf 19-20. Entspricht 3 + floor((level-1)/3).
   *
   * Ki-Rang (Kapitel 1: "Ki Rank"): Rang 1 ab Level 1, Rang 2 ab Level 5,
   * Rang 3 ab Level 10, Rang 4 ab Level 15.
   */
  _prepareProficiencyAndRank() {
    const level = this.attributes.level;
    this.attributes.prof = 3 + Math.floor((level - 1) / 3);

    let kiRank = 1;
    for (const threshold of DBZ.kiRankThresholds) {
      if (level >= threshold.level) {
        kiRank = threshold.rank;
        break;
      }
    }
    this.attributes.kirank = kiRank;
  }

  /**
   * Skill-Modifikatoren: Attributsmodifikator + (Proficiency-Bonus * Grad),
   * wobei Grad 0 (ungeübt), 1 (geübt) oder 2 (Expertise) ist.
   */
  _prepareSkills() {
    const prof = this.attributes.prof;
    for (const [key, config] of Object.entries(DBZ.skills)) {
      const skill = this.skills[key];
      if (!skill) continue;
      const abilityMod = this.abilities[config.ability]?.mod ?? 0;
      skill.ability = config.ability;
      skill.mod = abilityMod + (prof * skill.value);
    }
  }

  /**
   * Power Level (Kapitel 1): Maximum Hit Points * (Current Ki / 2) *
   * (Current Power + 1). Reiner Anzeigewert, fließt in keine andere
   * Berechnung ein.
   */
  _preparePowerLevel() {
    const hpMax = this.attributes.hp.max;
    const kiValue = this.attributes.ki.value;
    const power = this.attributes.power.value;
    this.attributes.powerlevel = Math.round(hpMax * (kiValue / 2) * (power + 1));
  }
}

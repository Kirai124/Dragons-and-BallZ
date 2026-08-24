import HitDice from "../../documents/actor/hit-dice.mjs";
import { defaultUnits, simplifyBonus } from "../../utils.mjs";
import FormulaField from "../fields/formula-field.mjs";
import LocalDocumentField from "../fields/local-document-field.mjs";
import CreatureTypeField from "../shared/creature-type-field.mjs";
import MovementField from "../shared/movement-field.mjs";
import RollConfigField from "../shared/roll-config-field.mjs";
import SensesField from "../shared/senses-field.mjs";
import SimpleTraitField from "./fields/simple-trait-field.mjs";
import AttributesFields from "./templates/attributes.mjs";
import CreatureTemplate from "./templates/creature.mjs";
import DetailsFields from "./templates/details.mjs";
import TraitsFields from "./templates/traits.mjs";
import { aggregateFormBonuses } from "../../dragonball-rules.mjs";

const {
  ArrayField, BooleanField, HTMLField, IntegerSortField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

/**
 * @import { ActorFavorites5e, CharacterActorSystemData, ResourceData } from "./_types.mjs";
 */

/**
 * System data definition for Characters.
 * @extends {CreatureTemplate<CharacterActorSystemData>}
 * @mixes CharacterActorSystemData
 */
export default class CharacterData extends CreatureTemplate {

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["DND5E.BONUSES", "DND5E.ROLL", "DND5E.CHARACTER"];

  /* -------------------------------------------- */

  /** @inheritDoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    supportsAdvancement: true
  }, { inplace: false }));

  /* -------------------------------------------- */

  /** @inheritDoc */
  static _systemType = "character";

  /* -------------------------------------------- */

  /** @inheritDoc */
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      attributes: new SchemaField({
        ...AttributesFields.common,
        ...AttributesFields.creature,
        hp: new SchemaField({
          ...AttributesFields.hitPoints,
          bloodied: new NumberField({
            nullable: false, min: 0, max: 100, persisted: false, initial: () => CONFIG.DND5E.bloodied.threshold,
            label: "DND5E.HITPOINTS.Bloodied.label"
          }),
          max: new NumberField({
            nullable: true, integer: true, min: 0, initial: null, label: "DND5E.HitPointsOverride",
            hint: "DND5E.HitPointsOverrideHint"
          }),
          bonuses: new SchemaField({
            level: new FormulaField({ deterministic: true, label: "DND5E.HitPointsBonusLevel" }),
            overall: new FormulaField({ deterministic: true, label: "DND5E.HitPointsBonusOverall" })
          })
        }, { label: "DND5E.HitPoints" }),
        death: new RollConfigField({
          ability: false,
          success: new NumberField({
            required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.DeathSaveSuccesses"
          }),
          failure: new NumberField({
            required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.DeathSaveFailures"
          }),
          bonuses: new SchemaField({}, { persisted: false })
        }, { label: "DND5E.DeathSave", labelPrefix: "DND5E.DEATH.FIELDS.attributes.death.roll." }),
        inspiration: new BooleanField({ required: true, label: "DND5E.Inspiration" }),
        piety: new SchemaField({
          value: new NumberField({
            min: 1, initial: null, nullable: true, integer: true, label: "DND5E.PIETY.FIELDS.value.label", placeholder: "0"
          }),
        }),
        ki: makeDragonBallResourceField({ label: "DBZ.Ki", classModifier: true }),
        stamina: makeDragonBallResourceField({ label: "DBZ.Stamina" }),
        godKi: new SchemaField({
          value: new NumberField({ required: true, nullable: false, integer: true, min: 0, max: 3, initial: 0, label: "DBZ.GodKi" }),
          max: new NumberField({ nullable: true, integer: true, min: 0, max: 3, initial: null, label: "DBZ.ResourceMaxOverride" }),
          calculatedMax: new NumberField({ persisted: false, nullable: false, min: 0, max: 3, initial: 0 }),
          effectiveMax: new NumberField({ persisted: false, nullable: false, min: 0, max: 3, initial: 0 }),
          pct: new NumberField({ persisted: false, nullable: false, min: 0, max: 100, initial: 0 })
        }, { label: "DBZ.GodKi" }),
        power: new SchemaField({
          value: new NumberField({ required: true, nullable: false, integer: true, initial: 0, label: "DBZ.Power" }),
          formBonus: new NumberField({ persisted: false, nullable: false, integer: true, initial: 0 }),
          total: new NumberField({ persisted: false, nullable: false, integer: true, initial: 0 }),
          threshold: new NumberField({ persisted: false, nullable: false, integer: true, initial: 0 }),
          overload: new NumberField({ persisted: false, nullable: false, integer: true, min: 0, initial: 0 })
        }, { label: "DBZ.Power" }),
        kiRank: new NumberField({ persisted: false, nullable: false, integer: true, min: 0, max: 4, initial: 0, label: "DBZ.KiRank" }),
        powerLevel: new NumberField({ persisted: false, nullable: false, min: 0, initial: 0, label: "DBZ.PowerLevel" })
      }, { label: "DND5E.Attributes" }),
      bastion: new SchemaField({
        name: new StringField({ required: true }),
        description: new HTMLField()
      }),
      details: new SchemaField({
        ...DetailsFields.common,
        ...DetailsFields.creature,
        background: new LocalDocumentField(foundry.documents.BaseItem, {
          required: true, fallback: true, label: "DND5E.Background"
        }),
        originalClass: new StringField({ required: true, label: "DND5E.ClassOriginal" }),
        xp: new SchemaField({
          value: new NumberField({
            required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DND5E.ExperiencePoints.Current"
          })
        }, { label: "DND5E.ExperiencePoints.Label" }),
        appearance: new StringField({ required: true, label: "DND5E.Appearance" }),
        trait: new StringField({ required: true, label: "DND5E.PersonalityTraits" }),
        gender: new StringField({ label: "DND5E.Gender" }),
        eyes: new StringField({ label: "DND5E.Eyes" }),
        height: new StringField({ label: "DND5E.Height" }),
        faith: new StringField({ label: "DND5E.Faith" }),
        hair: new StringField({ label: "DND5E.Hair" }),
        skin: new StringField({ label: "DND5E.Skin" }),
        age: new StringField({ label: "DND5E.Age" }),
        weight: new StringField({ label: "DND5E.Weight" })
      }, { label: "DND5E.Details" }),
      traits: new SchemaField({
        ...TraitsFields.common,
        ...TraitsFields.creature,
        weaponProf: new SimpleTraitField({
          mastery: new SchemaField({
            value: new SetField(new StringField()),
            bonus: new SetField(new StringField())
          })
        }, { label: "DND5E.TraitWeaponProf" }),
        armorProf: new SimpleTraitField({}, { label: "DND5E.TraitArmorProf" })
      }, { label: "DND5E.Traits" }),
      resources: new SchemaField({
        primary: makeResourceField({ label: "DND5E.ResourcePrimary" }),
        secondary: makeResourceField({ label: "DND5E.ResourceSecondary" }),
        tertiary: makeResourceField({ label: "DND5E.ResourceTertiary" })
      }, { label: "DND5E.Resources" }),
      favorites: new ArrayField(new SchemaField({
        type: new StringField({ required: true, blank: false }),
        id: new StringField({ required: true, blank: false }),
        sort: new IntegerSortField()
      }), { label: "DND5E.Favorites" })
    });
  }

  /* -------------------------------------------- */
  /*  Properties                                  */
  /* -------------------------------------------- */

  /**
   * Whether this Actor type represents a player character.
   * @returns {boolean}
   */
  get isCharacter() {
    return true;
  }

  /* -------------------------------------------- */
  /*  Data Migration                              */
  /* -------------------------------------------- */

  /** @inheritDoc */
  static _migrateData(source) {
    super._migrateData(source);
    AttributesFields._migrateArmorClass(source.attributes);
    AttributesFields._migrateInitiative(source.attributes);
    MovementField._migrate(source.attributes?.movement);
    return source;
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @inheritDoc */
  prepareBaseData() {
    this.attributes.hd = new HitDice(this.parent);

    for ( const item of this.parent.items ) {
      if ( item.type === "class" ) this.details.level += item.system.levels;
    }

    // Dragons and BallZ character proficiency bonus: +3 at levels 1-3, then +1 every three levels.
    const dbzLevel = Math.max(1, this.details.level ?? 1);
    this.attributes.prof = Math.min(9, 3 + Math.floor((dbzLevel - 1) / 3));

    // Experience required for next level
    const { xp, level } = this.details;
    xp.max = level >= CONFIG.DND5E.maxLevel ? Infinity : this.parent.getLevelExp(level || 1);
    xp.min = level ? this.parent.getLevelExp(level - 1) : 0;
    if ( Number.isFinite(xp.max) ) {
      const required = xp.max - xp.min;
      const pct = Math.round((xp.value - xp.min) * 100 / required);
      xp.pct = Math.clamp(pct, 0, 100);
    } else if ( game.settings.get("dragons-and-ballz", "levelingMode") === "xpBoons" ) {
      const overflow = xp.value - this.parent.getLevelExp(CONFIG.DND5E.maxLevel);
      xp.boonsEarned = Math.max(0, Math.floor(overflow / CONFIG.DND5E.epicBoonInterval));
      const progress = overflow - (CONFIG.DND5E.epicBoonInterval * xp.boonsEarned);
      xp.pct = Math.clamp(Math.round((progress / CONFIG.DND5E.epicBoonInterval) * 100), 0, 100);
    } else {
      xp.pct = 100;
    }

    AttributesFields.prepareBaseArmorClass.call(this);
    AttributesFields.prepareBaseEncumbrance.call(this);
    MovementField._shim(this.attributes.movement);
    SensesField._shim(this.attributes.senses);
    this.shimBonusData();
  }

  /* -------------------------------------------- */

  /**
   * Prepare movement & senses values derived from race item.
   */
  prepareEmbeddedData() {
    super.prepareEmbeddedData();
    if ( this.details.race instanceof Item ) {
      AttributesFields.prepareRace.call(this, this.details.race);
      this.details.type = this.details.race.system.type;
    } else {
      this.details.type = new CreatureTypeField({ swarm: false }).initialize({ value: "humanoid" }, this);
    }
    for ( const key of Object.keys(CONFIG.DND5E.movementTypes) ) this.attributes.movement.speeds[key] ??= 0;
    for ( const key of Object.keys(CONFIG.DND5E.senses) ) this.attributes.senses.ranges[key] ??= 0;
    this.attributes.movement.units ??= defaultUnits("length");
    this.attributes.senses.units ??= defaultUnits("length");
  }

  /* -------------------------------------------- */

  /**
   * Prepare remaining character data.
   */
  prepareDerivedData() {
    const rollData = this.parent.getRollData({ deterministic: true });
    const { originalSaves, originalSkills } = this.parent.getOriginalStats();

    this.details.tier = Math.ceil((this.details.level - 4) / 6) + 1;

    AttributesFields.prepareExhaustionLevel.call(this);
    this.prepareAbilities({ rollData, originalSaves });
    this.prepareCurrency();
    this.prepareSkills({ rollData, originalSkills });
    this.prepareTools({ rollData });
    AttributesFields.prepareSpellcastingAbility.call(this);
    AttributesFields.prepareArmorClass.call(this, rollData);
    AttributesFields.prepareConcentration.call(this, rollData);
    AttributesFields.prepareEncumbrance.call(this, rollData);
    AttributesFields.prepareInitiative.call(this, rollData);
    AttributesFields.prepareMovement.call(this, rollData);
    TraitsFields.prepareLanguages.call(this);
    TraitsFields.prepareResistImmune.call(this);

    // Hit Points
    const hpOptions = {};
    if ( this.attributes.hp.max === null ) {
      hpOptions.advancement = Object.values(this.parent.classes)
        .map(c => c.advancement.byType.HitPoints?.[0]).filter(a => a);
      hpOptions.bonus = (simplifyBonus(this.attributes.hp.bonuses.level, rollData) * this.details.level)
        + simplifyBonus(this.attributes.hp.bonuses.overall, rollData);
      hpOptions.mod = this.abilities[CONFIG.DND5E.defaultAbilities.hitPoints ?? "con"]?.mod ?? 0;
    }
    AttributesFields.prepareHitPoints.call(this, this.attributes.hp, hpOptions);
    this.prepareDragonBallResources();
  }


  /* -------------------------------------------- */

  /**
   * Prepare Dragons and BallZ resources derived from the handbook rules.
   * Stamina maximum is Level + Constitution modifier. Ki gained each level
   * is Constitution modifier + Wisdom modifier + Class Ki Modifier.
   * Persisted max fields are optional overrides for features and GM tuning.
   */
  prepareDragonBallResources() {
    const { attributes } = this;
    const level = Math.max(0, this.details.level ?? 0);
    const con = this.abilities.con?.mod ?? 0;
    const wis = this.abilities.wis?.mod ?? 0;

    const stamina = attributes.stamina;
    stamina.calculatedMax = Math.max(0, level + con + (stamina.bonus ?? 0));
    stamina.effectiveMax = stamina.max ?? stamina.calculatedMax;
    stamina.available = Math.max(0, stamina.value ?? 0) + Math.max(0, stamina.temp ?? 0);
    stamina.pct = stamina.effectiveMax > 0
      ? Math.clamp(Math.round((Math.max(0, stamina.value ?? 0) / stamina.effectiveMax) * 100), 0, 100)
      : 0;

    const ki = attributes.ki;
    // Ki is gained per class level. Each class item carries the handbook's Class Ki Modifier.
    // The persisted classModifier field remains a fallback for levels which are not represented by a class item.
    const classes = Object.values(this.parent.classes ?? {});
    const representedLevels = classes.reduce((sum, cls) => sum + Math.max(0, cls.system?.levels ?? 0), 0);
    const classKi = classes.reduce((sum, cls) => {
      const levels = Math.max(0, cls.system?.levels ?? 0);
      return sum + (levels * (cls.system?.kiModifier ?? 0));
    }, 0);
    const fallbackLevels = Math.max(0, level - representedLevels);
    const fallbackClassKi = fallbackLevels * (ki.classModifier ?? 0);
    ki.calculatedMax = Math.max(0, (level * (con + wis)) + classKi + fallbackClassKi + (ki.bonus ?? 0));
    ki.effectiveMax = ki.max ?? ki.calculatedMax;
    ki.available = Math.max(0, ki.value ?? 0) + Math.max(0, ki.temp ?? 0);
    ki.pct = ki.effectiveMax > 0
      ? Math.clamp(Math.round((Math.max(0, ki.value ?? 0) / ki.effectiveMax) * 100), 0, 100)
      : 0;

    const godKi = attributes.godKi;
    godKi.calculatedMax = level >= 20 ? 1 : 0;
    godKi.effectiveMax = godKi.max ?? godKi.calculatedMax;
    godKi.pct = godKi.effectiveMax > 0
      ? Math.clamp(Math.round((Math.max(0, godKi.value ?? 0) / godKi.effectiveMax) * 100), 0, 100)
      : 0;

    // Ki Rank follows the handbook's level breakpoints: 1 / 5 / 10 / 15.
    attributes.kiRank = level >= 15 ? 4 : level >= 10 ? 3 : level >= 5 ? 2 : level >= 1 ? 1 : 0;

    // Active Forms contribute their listed Power Bonus while the source value remains editable.
    const activeFormIds = this.parent.getFlag("dragons-and-ballz", "activeForms") ?? [];
    const activeForms = activeFormIds.map(id => this.parent.items.get(id)).filter(item => item?.type === "form");
    const formBonuses = aggregateFormBonuses(activeForms);
    const power = attributes.power;
    power.formBonus = activeForms.reduce((sum, item) => sum + Number(item.system.powerBonus ?? 0), 0);
    power.total = Number(power.value ?? 0) + power.formBonus;
    power.threshold = (attributes.prof ?? 0) + (godKi.value ?? 0);
    power.overload = Math.max(0, power.total - power.threshold);

    // Power directly improves Spirit checks and penalizes Ki Control checks by the same amount.
    const powerValue = power.total ?? 0;
    for ( const [skillId, modifier] of [["spi", powerValue], ["kic", -powerValue]] ) {
      const skill = this.skills?.[skillId];
      if ( !skill || !modifier ) continue;
      skill.bonus += modifier;
      skill.total += modifier;
      skill.passive += modifier;
    }

    const maxHP = attributes.hp.effectiveMax ?? attributes.hp.max ?? 0;
    attributes.powerLevel = Math.max(0, maxHP * ((ki.value ?? 0) / 2) * ((power.total ?? power.value ?? 0) + 1));

    // Deterministic Form effects: only unambiguous additive AC/movement text is automated.
    // Conditional/narrative Form benefits stay on the Item description for GM adjudication.
    if ( formBonuses.movementMultiplier !== 1 || formBonuses.movementFlat ) {
      for ( const key of Object.keys(attributes.movement?.speeds ?? {}) ) {
        const current = attributes.movement.speeds[key];
        if ( Number.isFinite(current) && current > 0 ) {
          attributes.movement.speeds[key] = Math.floor((current * formBonuses.movementMultiplier) + formBonuses.movementFlat);
        }
      }
    }
    if ( formBonuses.ac && Number.isFinite(attributes.ac?.value) ) attributes.ac.value += formBonuses.ac;

    // Charging halves the final movement value after deterministic Form movement bonuses are applied.
    if ( this.parent.getFlag("dragons-and-ballz", "chargingTechnique") ) {
      for ( const key of Object.keys(attributes.movement?.speeds ?? {}) ) {
        if ( Number.isFinite(attributes.movement.speeds[key]) && attributes.movement.speeds[key] > 0 ) {
          attributes.movement.speeds[key] = Math.floor(attributes.movement.speeds[key] / 2);
        }
      }
    }

    // Every two ranks of Power modify AC and all saving throws by one. Roll execution adds the same save bonus.
    const defensivePower = Math.trunc(powerValue / 2);
    if ( defensivePower ) {
      if ( Number.isFinite(attributes.ac?.value) ) attributes.ac.value += defensivePower;
      for ( const ability of Object.values(this.abilities ?? {}) ) {
        if ( Number.isFinite(ability.save?.bonus) ) ability.save.bonus += defensivePower;
        if ( Number.isFinite(ability.save?.value) ) ability.save.value += defensivePower;
      }
    }
  }

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    if ( (await super._preCreate(data, options, user)) === false ) return false;
    await TraitsFields.preCreateSize.call(this, data, options, user);

    if ( this.parent._stats?.compendiumSource?.startsWith("Compendium.") ) return;
    this.parent.updateSource({
      prototypeToken: {
        actorLink: true,
        disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
        sight: { enabled: true }
      }
    });
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _preUpdate(changes, options, user) {
    if ( (await super._preUpdate(changes, options, user)) === false ) return false;
    await AttributesFields.preUpdateHP.call(this, changes, options, user);
    await TraitsFields.preUpdateSize.call(this, changes, options, user);
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    AttributesFields.onUpdateHP.call(this, changed, options, userId);
    AttributesFields.onUpdateDeathSaves.call(this, changed, options, userId);
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Level used to determine cantrip scaling.
   * @param {Item5e} spell  Spell for which to fetch the cantrip level.
   * @returns {number}
   */
  cantripLevel(spell) {
    return this.details.level;
  }

  /* -------------------------------------------- */

  /**
   * Checks whether the item with the given relative UUID has been favorited
   * @param {string} favoriteId  The relative UUID of the item to check.
   * @returns {boolean}
   */
  hasFavorite(favoriteId) {
    return !!this.favorites.find(f => f.id === favoriteId);
  }

  /* -------------------------------------------- */

  /**
   * Add a favorite item to this actor.
   * If the given item is already favorite, this method has no effect.
   * @param {ActorFavorites5e} favorite  The favorite to add.
   * @returns {Promise<Actor5e>}
   * @throws If the item intended to be favorited does not belong to this actor.
   */
  addFavorite(favorite) {
    if ( this.hasFavorite(favorite.id) ) return Promise.resolve(this.parent);

    if ( favorite.id.startsWith(".") && fromUuidSync(favorite.id, { relative: this.parent }) === null ) {
      // Assume that an ID starting with a "." is a relative ID.
      throw new Error(`The item with id ${favorite.id} is not owned by actor ${this.parent.id}`);
    }

    let maxSort = 0;
    const favorites = this.favorites.map(f => {
      if ( f.sort > maxSort ) maxSort = f.sort;
      return { ...f };
    });
    favorites.push({ ...favorite, sort: maxSort + CONST.SORT_INTEGER_DENSITY });
    return this.parent.update({ "system.favorites": favorites });
  }

  /* -------------------------------------------- */

  /**
   * Removes the favorite with the given relative UUID or resource ID
   * @param {string} favoriteId  The relative UUID or resource ID of the favorite to remove.
   * @returns {Promise<Actor5e>}
   */
  removeFavorite(favoriteId) {
    if ( favoriteId.startsWith("resources.") ) return this.parent.update({ [`system.${favoriteId}.max`]: 0 });
    const favorites = this.favorites.filter(f => f.id !== favoriteId);
    return this.parent.update({ "system.favorites": favorites });
  }
}

/* -------------------------------------------- */


/**
 * Produce a schema field for a Dragons and BallZ consumable resource.
 * @param {object} options
 * @param {string} options.label
 * @param {boolean} [options.classModifier=false]
 * @returns {SchemaField}
 */
function makeDragonBallResourceField({ label, classModifier=false }) {
  const fields = {
    value: new NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0, label }),
    temp: new NumberField({ required: true, nullable: false, integer: true, min: 0, initial: 0, label: "DBZ.Temp" }),
    max: new NumberField({ nullable: true, integer: true, min: 0, initial: null, label: "DBZ.ResourceMaxOverride" }),
    bonus: new NumberField({ required: true, nullable: false, integer: true, initial: 0, label: "DBZ.ResourceBonus" }),
    calculatedMax: new NumberField({ persisted: false, nullable: false, integer: true, min: 0, initial: 0 }),
    effectiveMax: new NumberField({ persisted: false, nullable: false, integer: true, min: 0, initial: 0 }),
    available: new NumberField({ persisted: false, nullable: false, integer: true, min: 0, initial: 0 }),
    pct: new NumberField({ persisted: false, nullable: false, min: 0, max: 100, initial: 0 })
  };
  if ( classModifier ) {
    fields.classModifier = new NumberField({
      required: true, nullable: false, integer: true, initial: 0, label: "DBZ.ClassKiModifier"
    });
  }
  return new SchemaField(fields, { label });
}

/**
 * Produce the schema field for a simple trait.
 * @param {object} schemaOptions  Options passed to the outer schema.
 * @returns {ResourceData}
 */
function makeResourceField(schemaOptions={}) {
  return new SchemaField({
    value: new NumberField({required: true, integer: true, initial: 0, labels: "DND5E.ResourceValue"}),
    max: new NumberField({required: true, integer: true, initial: 0, labels: "DND5E.ResourceMax"}),
    sr: new BooleanField({required: true, labels: "DND5E.REST.Short.Recovery"}),
    lr: new BooleanField({required: true, labels: "DND5E.REST.Long.Recovery"}),
    label: new StringField({required: true, labels: "DND5E.ResourceLabel"})
  }, schemaOptions);
}

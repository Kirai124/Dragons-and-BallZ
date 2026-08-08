/**
 * Erweiterte Actor-Klasse für Dragons and BallZ.
 *
 * Rassen werden als eingebettete Item-Dokumente vom Typ "race" geführt.
 * Statische Rassenboni werden hier als Derived Data auf den Charakter
 * angewendet; der gespeicherte Basiswert des Actors bleibt unverändert.
 */
export default class DragonsBallZActor extends Actor {
  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    if (this.type !== "character") return;

    const raceItems = this.items.filter(item => item.type === "race");
    const primaryRace = raceItems.find(item => !item.system.subrace);
    const subraceItems = raceItems.filter(item => item.system.subrace);

    this.system.details.raceSkillChoices = 0;
    this.system.details.race = primaryRace?.name ?? "";
    this.system.details.subrace = subraceItems[0]?.name ?? "";

    // Derived values always start from the Actor source to avoid stacking
    // race bonuses on repeated prepareDerivedData calls.
    for (const [key, ability] of Object.entries(this.system.abilities)) {
      const sourceAbility = this.system._source.abilities?.[key];
      if (sourceAbility) ability.value = sourceAbility.value;
    }
    for (const [key, skill] of Object.entries(this.system.skills)) {
      const sourceSkill = this.system._source.skills?.[key];
      if (sourceSkill) skill.value = sourceSkill.value;
    }
    const baseMovement = this.system._source.attributes?.movement?.walk;
    if (Number.isFinite(baseMovement)) this.system.attributes.movement.walk = baseMovement;

    this._applyRaceBonuses(primaryRace);
    this._applyRaceBonuses(subraceItems[0], { subrace: true });

    this._prepareRaceContext(primaryRace, subraceItems);
  }

  /**
   * Wendet nur die eindeutig strukturierten, statischen Race-Boni an.
   * Komplexe Regeltexte bleiben als Features am Item erhalten und werden
   * später durch das allgemeine Feature-/Effect-System mechanisiert.
   */
  _applyRaceBonuses(item, { subrace = false } = {}) {
    if (!item) return;

    const system = item.system;
    const source = system.abilityBonuses;
    let asi = {};
    try { asi = JSON.parse(source || "{}"); } catch { asi = {}; }

    const abilities = this.system.abilities;
    for (const [key, bonus] of Object.entries(asi.fixed ?? {})) {
      if (abilities[key]) abilities[key].value += Number(bonus) || 0;
    }

    if (asi.all) {
      for (const ability of Object.values(abilities)) {
        ability.value += Number(asi.all) || 0;
      }
    }

    // Skill-Proficiencies aus dem Regelwerk.
    let skills = [];
    try { skills = JSON.parse(system.skills || "[]"); } catch { skills = []; }
    for (const key of skills) {
      if (this.system.skills[key]) {
        this.system.skills[key].value = Math.max(1, this.system.skills[key].value);
      }
    }

    // "Any 2 Skills" bleibt bewusst eine Choice und wird nicht zufällig vergeben.
    if (Number(system.skillChoiceCount) > 0) {
      this.system.details.raceSkillChoices = Number(system.skillChoiceCount);
    }

    // Bewegung: Subraces dürfen sie ausdrücklich ersetzen/modifizieren.
    if (!subrace && Number.isFinite(system.speed)) {
      this.system.attributes.movement.walk = Number(system.speed);
    }
  }

  _prepareRaceContext(primaryRace, subraceItems) {
    this.system.details.raceData = {
      primaryId: primaryRace?.system?.sourceId ?? "",
      primaryCategory: primaryRace?.system?.category ?? "",
      subraceIds: subraceItems.map(i => i.system.sourceId).filter(Boolean),
      replacementLimit: subraceItems[0]?.system?.replacementLimit ?? 0
    };
  }
}

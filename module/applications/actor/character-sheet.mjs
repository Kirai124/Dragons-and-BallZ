import { DBZ } from "../../config.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

function markdownToHtml(text="") {
  let value = String(text)
    .replace(/\\r/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)(?:\s*\{[^}]*\})?/g, "")
    .replace(/\{\{artist[\s\S]*?\}\}/g, "")
    .replace(/\\column/g, "")
    .trim();

  // The race source is authored Markdown; keep the renderer deliberately small
  // here so arbitrary HTML is not injected into the sheet.
  value = value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  value = value.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  value = value.replace(/\*(.+?)\*/g, "<em>$1</em>");
  value = value.replace(/^##### (.+)$/gm, "<h5>$1</h5>");
  value = value.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  value = value.replace(/^- (.+)$/gm, "<li>$1</li>");
  value = value.replace(/(<li>.*<\/li>\n?)+/g, match => `<ul>${match}</ul>`);
  return value.split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
}

export default class CharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["dragons-and-ballz", "dnd5e2", "sheet", "actor", "character"],
    position: { width: 980, height: 760 },
    window: { resizable: true },
    form: { submitOnChange: true }
  };

  static PARTS = {
    sheet: {
      template: "systems/dragons-and-ballz/templates/actors/character-sheet.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.actor.system;

    context.actor = this.actor;
    context.system = system;
    context.source = this.actor.toObject().system;
    context.editable = this.isEditable;

    context.abilities = Object.entries(DBZ.abilities).map(([key, label]) => ({
      key,
      label,
      abbr: DBZ.abilityAbbreviations[key],
      ...system.abilities[key]
    }));

    context.skills = Object.entries(DBZ.skills).map(([key, config]) => {
      const skill = system.skills[key];
      return {
        key,
        label: config.label,
        abilityAbbr: DBZ.abilityAbbreviations[config.ability],
        isNone: skill.value === 0,
        isProficient: skill.value === 1,
        isExpert: skill.value === 2,
        ...skill
      };
    }).sort((a, b) => game.i18n.localize(a.label).localeCompare(game.i18n.localize(b.label)));

    context.alignments = DBZ.alignments;
    context.races = DBZ.races.filter(r => !r.subrace);
    context.subraces = DBZ.races.filter(r => r.subrace);

    const raceItems = this.actor.items.filter(item => item.type === "race");
    context.primaryRaceItem = raceItems.find(item => !item.system.subrace);
    context.subraceItems = raceItems.filter(item => item.system.subrace);
    context.raceFeatures = [];

    for (const item of raceItems) {
      let features = [];
      try { features = JSON.parse(item.system.features || "[]"); } catch { features = []; }
      context.raceFeatures.push({
        itemId: item.id,
        name: item.name,
        subrace: item.system.subrace,
        category: item.system.category,
        features: features.map(feature => ({
          ...feature,
          html: markdownToHtml(feature.description)
        }))
      });
    }

    return context;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    const root = this.element;
    if (!root) return;

    root.querySelectorAll("[data-action='create-race']").forEach(button => {
      button.addEventListener("click", async event => {
        event.preventDefault();
        const select = root.querySelector("[name='dbz.race']");
        const id = select?.value;
        if (!id) return;
        await this._createRace(id, false);
      });
    });

    root.querySelectorAll("[data-action='create-subrace']").forEach(button => {
      button.addEventListener("click", async event => {
        event.preventDefault();
        const select = root.querySelector("[name='dbz.subrace']");
        const id = select?.value;
        if (!id) return;
        await this._createRace(id, true);
      });
    });

    root.querySelectorAll("[data-action='delete-race-item']").forEach(button => {
      button.addEventListener("click", async event => {
        event.preventDefault();
        const itemId = button.dataset.itemId;
        if (itemId) await this.actor.deleteEmbeddedDocuments("Item", [itemId]);
      });
    });
  }

  async _createRace(sourceId, subrace) {
    const data = DBZ.raceById[sourceId];
    if (!data) return;

    if (subrace && data.parent === "Any Humanoid") {
      const category = this.actor.items.find(i => i.type === "race" && !i.system.subrace)?.system?.category ?? "";
      if (category !== "Humanoid") {
        ui.notifications.warn("Hybrids können nur mit einer Humanoid-Rasse verwendet werden.");
        return;
      }
    }

    const existing = this.actor.items.filter(i => i.type === "race" && Boolean(i.system.subrace) === subrace);
    if (existing.length) {
      await this.actor.deleteEmbeddedDocuments("Item", existing.map(i => i.id));
    }

    const system = {
      sourceId: data.id,
      category: data.category,
      subrace: Boolean(subrace),
      parent: data.parent ?? "",
      replacementLimit: data.replacementLimit ?? 3,
      description: data.description ?? "",
      abilityBonuses: JSON.stringify(data.abilityBonuses ?? {}),
      speed: data.speed ?? null,
      languages: data.languages ?? "",
      skills: JSON.stringify(data.skills ?? []),
      skillChoiceCount: data.skillChoiceCount ?? 0,
      lockedFeatures: JSON.stringify(data.lockedFeatures ?? []),
      features: JSON.stringify(data.features ?? []),
      sourceText: data.sourceText ?? ""
    };

    await this.actor.createEmbeddedDocuments("Item", [{
      name: data.name,
      type: "race",
      system
    }]);
  }
}

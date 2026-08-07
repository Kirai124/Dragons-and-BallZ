import CharacterData from "./module/data/actor/character.mjs";
import DragonsBallZActor from "./module/documents/actor.mjs";
import CharacterSheet from "./module/applications/actor/character-sheet.mjs";

Hooks.once("init", function () {
  console.log("Dragons and BallZ | Initialisiere System (Grundgerüst)");

  game.dragonsandballz = {
    documents: {
      DragonsBallZActor
    }
  };

  // Document-Klassen
  CONFIG.Actor.documentClass = DragonsBallZActor;

  // Datenmodelle pro Actor-Typ
  CONFIG.Actor.dataModels = {
    character: CharacterData
  };

  // Sheets registrieren
  const DocumentSheetConfig = foundry.applications.apps.DocumentSheetConfig;
  DocumentSheetConfig.unregisterSheet(Actor, "core", foundry.appv1.sheets.ActorSheet);
  DocumentSheetConfig.registerSheet(Actor, "dragons-and-ballz", CharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "DBZ.SheetCharacter"
  });
});

Hooks.once("ready", function () {
  console.log("Dragons and BallZ | System bereit");
});

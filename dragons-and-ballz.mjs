import { DBZ } from "./module/config.mjs";
import CharacterData from "./module/data/actor/character.mjs";
import DragonsBallZActor from "./module/documents/actor.mjs";
import CharacterSheet from "./module/applications/actor/character-sheet.mjs";
import RaceData from "./module/data/item/race.mjs";

Hooks.once("init", function () {
  console.log("Dragons and BallZ | Initialisiere System (Basiswerte)");

  game.dragonsandballz = {
    documents: {
      DragonsBallZActor
    }
  };

  CONFIG.DBZ = DBZ;

  // Document-Klassen
  CONFIG.Actor.documentClass = DragonsBallZActor;

  // Datenmodelle pro Actor-Typ
  CONFIG.Actor.dataModels = {
    character: CharacterData
  };

  // Eigenes Item-DataModel für Rassen/Subraces.
  CONFIG.Item.dataModels = {
    race: RaceData
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

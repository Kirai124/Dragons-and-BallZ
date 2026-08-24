# Dragons and BallZ – Foundry VTT System

Eigenständiges Foundry-VTT-System für das Homebrew-Regelwerk **Dragons and BallZ** auf Basis der übernommenen D&D5e-/ApplicationV2-Architektur für Foundry VTT 14.

## Status: v1.1.0 – kompletter Fünf-Schritte-Unterbau

Die erste vollständige Systemrunde ist abgeschlossen. Der Standard-D&D5e-ApplicationV2-Look bleibt erhalten, während Charakterressourcen, Charaktererstellung, Regelwerks-Compendiums, Dragon-Ball-Kampfworkflows und eine eigene QA-/Diagnoseschicht integriert sind.

### Character Sheet

**v1.1.0 Visual Refresh:** Der Character Sheet orientiert sich wieder direkt am offiziellen D&D5e-v2-Look. Header, Grundproportionen, Sidebar, Lozenges, Meter, Cards, Pills, Gold Buttons, Typografie und Inventarlisten verwenden die vorhandene D&D5e-Designsprache. Die Dragon-Ball-spezifischen Werte und Tabs bleiben vollständig erhalten; diese Änderung ist rein visuell.

- Eigene Ressourcen für **Ki**, **Temporary Ki**, **Stamina**, **Temporary Stamina**, **God Ki**, **Power**, **Power Level** und **Ki Rank**.
- Eigene Skills **Spirit**, **Ki Control** und **Technology**.
- Der frühere Spell-Tab ist in **Transformationen** und **Ki-Angriffe / Nahkampf-Manöver** aufgeteilt.
- Beide DBZ-Tabs besitzen eine kompakte Live-Statusleiste für Ki Rank, Ki, Stamina, God Ki, Power/Threshold, Power Level, aktive Forms, Charging, Conceal Ki und Power Overload.
- Forms und Techniques werden automatisch in ihre richtigen Abschnitte einsortiert und zeigen kompakte DBZ-Subtitles im normalen D&D5e-Inventarstil.

### Charaktererstellung / Advancements

- Races/Subraces, Backgrounds und Classes verwenden Foundry-Advancements für feste Grants und Auswahlentscheidungen.
- Ability-Score-Anpassungen, Skills, Sprachen, Saving Throws, Class Features und Heroic/Technique-Auswahlen sind angebunden.
- Die vier Klassen **Martial Artist, Blaster, Bruiser und Hero** tragen ihre Class-Ki-Modifier und Level-Advancements.

### Regelwerks-Content

Die ausgelieferten Compendiums enthalten **922 handbook-basierte Dokumente**:

| Compendium | Einträge |
| --- | ---: |
| Races & Subraces | 25 |
| Backgrounds | 14 |
| Classes | 4 |
| Feats & Training / grantbare Features | 396 |
| Forms | 78 |
| Techniques | 178 |
| Equipment | 227 |
| **Gesamt** | **922** |

Jedes importierte Dokument enthält unter `flags.dragons-and-ballz.handbook` seine Quellzeilen aus dem Handbuch. Die menschenlesbaren Quellen liegen in `packs-src/`; `npm run build:packs` erzeugt daraus die ausgelieferten `.db`-Packs.

Der v1.0-Content-Audit korrigiert außerdem mehrere beim ursprünglichen Import nicht erkannte Form-Werte (u. a. Rank/Power bei Super Earthling, Earthling Potential, Android-Forms und einigen lernbaren Forms). Reine Familienüberschriften wie `Potential Unlock` und `Kaioken` werden nicht mehr als benutzbare Forms ausgeliefert.

### Kampf-Workflow

- **Basic Ki Blast** als DEX-Ranged-Attack inklusive Ki-Damage und Stamina-Zusatzangriffen.
- Technique-Typen verwenden ihre Regelwerksattribute: Blast/WIS, Beam/CON, Barrage/DEX, Omni/INT, Melee/Weapon/STR.
- Power, Static Bonus, Attack Rolls, Save DCs, Ki/Stamina, Temporary Resources, God Ki, Overcharge und Technique-Upkeep sind angebunden.
- Chargeable Techniques können geladen und freigesetzt werden; Charging halbiert die finale Bewegung und verwendet Concentration.
- Forms verwenden Transformation-/Power-Up-Slots, Family-Konflikte, Activation/Upkeep, Power, God-Form-Prüfungen und Berserker-Saves.
- **Power Overload**, **Clash**, **Ki Sense**, **Conceal Ki** und die universellen Stamina-Manöver sind integriert.
- Sicher automatisch aus Form-Text interpretierbare Effekte werden berücksichtigt: additive AC-/Movement-Boni, eindeutige Movement-Multiplikatoren, Damage-Die-Steps, pauschale zusätzliche Damage Dice und zusätzliche Basic-Ki-Blast-Angriffe. Bedingte oder narrative Effekte bleiben absichtlich beim Regeltext und werden nicht geraten.

### Qualitätssicherung / Schritt 5

Neben `npm run validate` besitzt das System echte Node-Tests für den DBZ-Regelparser, Compendium-Qualität, korrigierte Form-Daten, Lokalisierung und die finalen Character-Sheet-/Workflow-Exports.

```bash
npm install
npm run build:css
npm run build:packs
npm test
```

Innerhalb einer laufenden Foundry-Welt steht zusätzlich eine nicht-destruktive Laufzeitdiagnose zur Verfügung:

```js
await game.dnd5e.dragonball.runDiagnostics()
```

Optional kann ein Actor übergeben werden. Ohne Argument verwendet die Diagnose einen kontrollierten Token oder den dem Benutzer zugewiesenen Character. Sie prüft System-ID/Foundry-Version, DBZ-DataModels, alle sieben Compendiums sowie – wenn vorhanden – Character-Ressourcen, DBZ-Skills und aktive Form-Referenzen.

## Roadmap 1.0

1. [x] Engine-/Namespace-/V14-Basis stabilisieren
2. [x] Dragon-Ball-Charakterressourcen und Skills integrieren
3. [x] Item-/Content-Modelle, Compendiums und Character-Creation-Advancements
4. [x] Dragon-Ball-Kampfautomatisierung und Forms/Techniques
5. [x] Sheet-/Content-Polish, deterministische Form-Effekte, Tests und Laufzeitdiagnose

Nicht jeder freie Homebrew-Regeltext lässt sich ohne GM-Entscheidung vollständig automatisieren. Effekte wie narrative Zielumleitung, frei gewählte Tokenbewegung oder stark situationsabhängige Features bleiben bewusst GM-gestützt, anstatt vom System falsch interpretiert zu werden.

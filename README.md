# Dragons and BallZ – Foundry VTT System

Eigenständiges Foundry-VTT-System für das homebrew Regelwerk **"Dragons and BallZ"**,
im Aufbau-Stil an `dnd5e` (v13, ApplicationV2/DataModel-Architektur) angelehnt, aber
mit komplett eigenen Werten/Mechaniken statt D&D-Inhalten.

## Status: Grundgerüst (v0.1.0)

Aktuell vorhanden:
- System lädt in Foundry (v13.347+), registriert einen Actor-Typ `character`.
- Minimaler Charakterbogen (Name, Bild, Notizfeld) – funktionsfähig, aber ohne
  Spielwerte.

**Hinweis:** Die konkreten Attribute (Power Level, Ki, Rassen, Techniken ...)
fehlen noch, weil das hochgeladene Regelwerk-PDF beim ersten Versuch beschädigt/
unvollständig ankam und noch nicht ausgewertet werden konnte. Sobald das PDF
lesbar vorliegt, wird das Datenmodell in `module/data/actor/character.mjs`
entsprechend erweitert.

## Roadmap (analog zum One-Piece-Projekt)

1. [x] Grundgerüst: system.json, Ordnerstruktur, minimaler Charakterbogen
2. [ ] Basiswerte/Attribute laut Regelwerk
3. [ ] Rassen/Spezies als auswählbare Items mit Boni
4. [ ] Klassen bzw. Archetyp-Äquivalent
5. [ ] Techniken/Fähigkeiten inkl. Automatisierung (Schaden, Ki-Kosten, Chat-Ausgabe)
6. [ ] Ausrüstung/Items
7. [ ] Kompendien mit Inhalten aus dem Regelwerk
8. [ ] Feinschliff, Icons, Polishing

## Struktur

```
dragons-and-ballz.mjs         Einstiegspunkt, registriert Sheets/DataModels
module/
  data/actor/                 DataModel-Klassen (Actor-Werte)
  documents/                  Erweiterte Document-Klassen (Spiellogik)
  applications/actor/         Sheet-Klassen (ApplicationV2)
templates/actors/             Handlebars-Templates der Sheets
css/                          Styles
lang/                         Übersetzungen (de/en)
packs/                        Kompendien (folgen)
```

## Installation (Entwicklung)

Repo direkt in den Foundry-Data-Ordner klonen:

```
git clone https://github.com/Kirai124/Dragons-and-BallZ.git Data/systems/dragons-and-ballz
```

Danach in Foundry unter "Spielsysteme installieren" auffindbar bzw. per
`git pull` im Systemordner aktuell halten.

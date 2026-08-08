# Dragons and BallZ – Foundry VTT System

Eigenständiges Foundry-VTT-System für das Homebrew-Regelwerk **"Dragons and BallZ"**.
Die Architektur orientiert sich an der mitgelieferten `dnd5e`-Referenz (ApplicationV2/
DataModel), verwendet aber ausschließlich die eigenen DBZ-Werte und Mechaniken.

## Status: v0.3.0 – Races / Subraces

### Implementiert

- Foundry-v13-kompatibles `Item`-DataModel für `type: "race"`.
- 21 primäre Rassen aus Kapitel 3 als generierte Registry:
  - 8 Humanoid-Rassen
  - 13 Alien-Rassen
- Subrace-Daten für:
  - Speedster
  - Cyborg inkl. Cybernetic, Big-Gete und Neo-Mutant-Varianten
  - Hybrids
  - Optional: Reincarnation
- Strukturierte Rassenwerte:
  - Ability-Score-Boni
  - Ability-Score-Choices
  - Bewegung
  - Sprachen
  - Skill-Proficiencies
  - Skill-Choices
  - Racial Features
  - Subrace-/Replacement-Metadaten
- Rassen werden als echte Embedded Items auf dem Actor gespeichert.
- Statische Rassenboni werden als Derived Data angewendet; der gespeicherte
  Basiswert des Actors wird nicht überschrieben.
- Character Sheet wurde auf eine deutlich engere `dnd5e`-artige ApplicationV2-
  Struktur umgebaut: Banner-Header, Sidebar, Filigree-Boxen, Ability-Grid,
  kompakte Skill-Liste und Feature-Bereich.
- Race/Subrace-Auswahl direkt im Character Sheet.
- Racial Features werden direkt aus den Race Items im Sheet dargestellt.
- Ein generierter Parser für den Homebrewery-Markdown-Export liegt unter
  `scripts/parse-races.mjs`.

### Wichtig: komplexe Rassenmechaniken

Kapitel 3 enthält zahlreiche Features, die nicht auf einen einzelnen statischen
Bonus reduzierbar sind (z. B. Transformationszugang, Technique-Auswahl,
Regeneration, Absorption, Level-Gates, Superiority, Mysticism, Genetic Makeup).
Diese werden bewusst zunächst vollständig am Race Item als Feature-Text erhalten.
Die eigentliche Automatisierung folgt mit dem allgemeinen Feature-/Effect-System,
damit dieselbe Infrastruktur später auch Klassen, Feats, Forms und Techniken
verwenden kann.

## Race Parser

Der Parser arbeitet gegen den unveränderten Markdown-Export des Regelwerks:

```bash
node scripts/parse-races.mjs path/to/markdown.md
```

Er erzeugt `module/data/races.mjs`. Die generierte Datei soll nicht von Hand
bearbeitet werden.

## Roadmap

1. [x] Grundgerüst
2. [x] Basiswerte / Attribute
3. [x] Rassen / Subraces
4. [ ] Klassen bzw. Archetyp-Äquivalent
5. [ ] Techniken / Fähigkeiten inkl. Automatisierung
6. [ ] Ausrüstung / Items
7. [ ] Kompendien
8. [ ] Feinschliff / Icons / Polishing

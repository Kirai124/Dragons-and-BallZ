const { StringField } = foundry.data.fields;

/**
 * Data model for a Player Character in Dragons and BallZ.
 *
 * GRUNDGERÜST: Dies ist bewusst noch minimal gehalten. Die eigentlichen
 * Werte (z.B. Power Level, Ki, Attribute, Rassen-Boni ...) werden hier
 * ergänzt, sobald das Regelwerk final ausgewertet wurde. Neue Felder
 * werden immer über `defineSchema()` hinzugefügt - nie direkt am
 * Actor-Objekt, damit Foundry sie korrekt speichert/validiert.
 */
export default class CharacterData extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    return {
      notes: new StringField({
        required: false,
        blank: true,
        initial: "",
        label: "DBZ.Notes"
      })
    };
  }

  /**
   * Berechnete/abgeleitete Werte (z.B. Modifikatoren aus Basiswerten)
   * werden später hier gesetzt, sobald die Attribute feststehen.
   * @override
   */
  prepareDerivedData() {
    // Platzhalter für kommende Schritte.
  }
}

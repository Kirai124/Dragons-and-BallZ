/**
 * Mixin used to add system flags enforcement to types.
 * @template {foundry.abstract.Document} T
 * @param {typeof T} Base  The base document class to wrap.
 * @returns {typeof SystemFlags}
 * @mixin
 */
export default function SystemFlagsMixin(Base) {
  class SystemFlags extends Base {
    /**
     * Get the data model that represents system flags.
     * @type {typeof DataModel|null}
     * @abstract
     */
    get _systemFlagsDataModel() {
      return null;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    prepareData() {
      super.prepareData();
      if ( ("dnd5e" in this.flags) && this._systemFlagsDataModel ) {
        this.flags["dragons-and-ballz"] = new this._systemFlagsDataModel(this._source.flags["dragons-and-ballz"], { parent: this });
      }
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async setFlag(scope, key, value) {
      if ( (scope === "dnd5e") && this._systemFlagsDataModel ) {
        let diff;
        const changes = foundry.utils.expandObject({ [key]: value });
        if ( this.flags["dragons-and-ballz"] ) diff = this.flags["dragons-and-ballz"].updateSource(changes, { dryRun: true });
        else diff = new this._systemFlagsDataModel(changes, { parent: this }).toObject();
        return this.update({ flags: { dnd5e: diff } });
      }
      return super.setFlag(scope, key, value);
    }
  }
  return SystemFlags;
}

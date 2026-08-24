import BackgroundData from "./background.mjs";
import ClassData from "./class.mjs";
import ConsumableData from "./consumable.mjs";
import ContainerData from "./container.mjs";
import EquipmentData from "./equipment.mjs";
import FacilityData from "./facility.mjs";
import FeatData from "./feat.mjs";
import FormData from "./form.mjs";
import LootData from "./loot.mjs";
import RaceData from "./race.mjs";
import SpellData from "./spell.mjs";
import SubclassData from "./subclass.mjs";
import SubraceData from "./subrace.mjs";
import TechniqueData from "./technique.mjs";
import TrainingData from "./training.mjs";
import ToolData from "./tool.mjs";
import WeaponData from "./weapon.mjs";

export {
  BackgroundData,
  ClassData,
  ConsumableData,
  ContainerData,
  EquipmentData,
  FacilityData,
  FeatData,
  FormData,
  LootData,
  RaceData,
  SpellData,
  SubclassData,
  SubraceData,
  TechniqueData,
  TrainingData,
  ToolData,
  WeaponData
};
export {default as ItemTypeField} from "./fields/item-type-field.mjs";
export {default as SpellcastingField} from "./fields/spellcasting-field.mjs";
export {default as ActivitiesTemplate} from "./templates/activities.mjs";
export {default as AdvancementTemplate} from "./templates/advancement.mjs";
export {default as EquippableItemTemplate} from "./templates/equippable-item.mjs";
export {default as IdentifiableTemplate} from "./templates/identifiable.mjs";
export {default as ItemDescriptionTemplate} from "./templates/item-description.mjs";
export {default as ItemTypeTemplate} from "./templates/item-type.mjs";
export {default as MountableTemplate} from "./templates/mountable.mjs";
export {default as PhysicalItemTemplate} from "./templates/physical-item.mjs";
export * as startingEquipment from "./templates/starting-equipment.mjs";

export const config = {
  background: BackgroundData,
  container: ContainerData,
  class: ClassData,
  consumable: ConsumableData,
  equipment: EquipmentData,
  facility: FacilityData,
  feat: FeatData,
  form: FormData,
  loot: LootData,
  race: RaceData,
  spell: SpellData,
  subclass: SubclassData,
  subrace: SubraceData,
  technique: TechniqueData,
  training: TrainingData,
  tool: ToolData,
  weapon: WeaponData
};

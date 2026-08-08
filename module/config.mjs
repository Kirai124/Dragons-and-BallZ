/**
 * Zentrale Konfiguration für Dragons and BallZ.
 * Analog zu CONFIG.DND5E in dnd5e, aber mit den eigenen Werten aus dem Regelwerk.
 */
export const DBZ = {};

/* -------------------------------------------- */
/* Attribute (Ability Scores)                    */
/* -------------------------------------------- */

DBZ.abilities = {
  str: "DBZ.AbilityStr",
  dex: "DBZ.AbilityDex",
  con: "DBZ.AbilityCon",
  int: "DBZ.AbilityInt",
  wis: "DBZ.AbilityWis",
  cha: "DBZ.AbilityCha"
};

DBZ.abilityAbbreviations = {
  str: "DBZ.AbilityStrAbbr",
  dex: "DBZ.AbilityDexAbbr",
  con: "DBZ.AbilityConAbbr",
  int: "DBZ.AbilityIntAbbr",
  wis: "DBZ.AbilityWisAbbr",
  cha: "DBZ.AbilityChaAbbr"
};

/* -------------------------------------------- */
/* Skills - Standard + die 3 neuen aus Kapitel 1 */
/* -------------------------------------------- */

DBZ.skills = {
  acr: { label: "DBZ.SkillAcr", ability: "dex" },
  ani: { label: "DBZ.SkillAni", ability: "wis" },
  arc: { label: "DBZ.SkillArc", ability: "int" },
  ath: { label: "DBZ.SkillAth", ability: "str" },
  dec: { label: "DBZ.SkillDec", ability: "cha" },
  his: { label: "DBZ.SkillHis", ability: "int" },
  ins: { label: "DBZ.SkillIns", ability: "wis" },
  itm: { label: "DBZ.SkillItm", ability: "cha" },
  inv: { label: "DBZ.SkillInv", ability: "int" },
  kic: { label: "DBZ.SkillKic", ability: "wis" }, // Ki Control (neu)
  med: { label: "DBZ.SkillMed", ability: "wis" },
  nat: { label: "DBZ.SkillNat", ability: "int" },
  prc: { label: "DBZ.SkillPrc", ability: "wis" },
  prf: { label: "DBZ.SkillPrf", ability: "cha" },
  per: { label: "DBZ.SkillPer", ability: "cha" },
  rel: { label: "DBZ.SkillRel", ability: "int" },
  slt: { label: "DBZ.SkillSlt", ability: "dex" },
  spi: { label: "DBZ.SkillSpi", ability: "wis" }, // Spirit (neu)
  ste: { label: "DBZ.SkillSte", ability: "dex" },
  sur: { label: "DBZ.SkillSur", ability: "wis" },
  tec: { label: "DBZ.SkillTec", ability: "int" }  // Technology (neu)
};

/* -------------------------------------------- */
/* Alignment                                     */
/* -------------------------------------------- */

DBZ.alignments = {
  lg: "DBZ.AlignmentLG",
  ng: "DBZ.AlignmentNG",
  cg: "DBZ.AlignmentCG",
  ln: "DBZ.AlignmentLN",
  tn: "DBZ.AlignmentTN",
  cn: "DBZ.AlignmentCN",
  le: "DBZ.AlignmentLE",
  ne: "DBZ.AlignmentNE",
  ce: "DBZ.AlignmentCE"
};

/* -------------------------------------------- */
/* Ki-Rang Schwellen (Kapitel 1: Ki Rank)        */
/* Rank 1 ab Level 1, Rank 2 ab Level 5,         */
/* Rank 3 ab Level 10, Rank 4 ab Level 15        */
/* -------------------------------------------- */

DBZ.kiRankThresholds = [
  { level: 15, rank: 4 },
  { level: 10, rank: 3 },
  { level: 5, rank: 2 },
  { level: 1, rank: 1 }
];

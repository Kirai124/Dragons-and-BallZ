import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..");
const SYSTEM_ID = "dragons-and-ballz";
const failures = [];

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

function walk(dir) {
  const out = [];
  for ( const entry of fs.readdirSync(dir, { withFileTypes: true }) ) {
    if ( ["node_modules", ".git"].includes(entry.name) ) continue;
    const full = path.join(dir, entry.name);
    if ( entry.isDirectory() ) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const system = JSON.parse(read("system.json"));
const pkg = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));

if ( system.id !== SYSTEM_ID ) failures.push(`system.json id is ${system.id}, expected ${SYSTEM_ID}`);
if ( system.version !== pkg.version ) {
  failures.push(`Version mismatch: system.json=${system.version}, package.json=${pkg.version}`);
}
if ( pkg.version !== lock.version || pkg.version !== lock.packages?.[""]?.version ) {
  failures.push(`Version mismatch in package-lock.json (expected ${pkg.version})`);
}
if ( !system.esmodules?.includes(`${SYSTEM_ID}.mjs`) ) {
  failures.push(`system.json must load ${SYSTEM_ID}.mjs`);
}
if ( !system.styles?.includes(`${SYSTEM_ID}.css`) ) {
  failures.push(`system.json must load ${SYSTEM_ID}.css from the system root`);
}

// Validate the Dragons and BallZ Item model/compendium layer introduced in v0.7.0 and populated in v0.8.0.
const dbzItemTypes = ["subrace", "training", "form", "technique"];
for ( const type of dbzItemTypes ) {
  if ( !(type in (system.documentTypes?.Item ?? {})) ) failures.push(`Missing Item document type in system.json: ${type}`);
}
const itemModule = read("module/data/item/_module.mjs");
for ( const type of dbzItemTypes ) {
  if ( !new RegExp(`\\b${type}:\\s*[A-Z]`).test(itemModule) ) failures.push(`Missing Item data model registration: ${type}`);
}
let compendiumDocuments = 0;
const compendiumIds = new Map();
const manifestPath = path.join(ROOT, "packs-src", "CONTENT-MANIFEST.json");
const contentManifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : null;
for ( const pack of system.packs ?? [] ) {
  if ( pack.system !== SYSTEM_ID ) failures.push(`Pack ${pack.name} must declare system=${SYSTEM_ID}`);
  const declaredPath = (pack.path ?? `./packs/${pack.name}.db`).replace(/^\.\//, "");
  const packPath = path.join(ROOT, declaredPath);
  if ( !fs.existsSync(packPath) ) {
    failures.push(`Compendium pack is missing: ${declaredPath}`);
    continue;
  }
  if ( path.extname(packPath) !== ".db" ) failures.push(`Pack ${pack.name} must ship as a legacy-compatible .db source for V14 migration`);

  const lines = fs.readFileSync(packPath, "utf8").split(/\r?\n/).filter(Boolean);
  const ids = new Set();
  for ( const [index, line] of lines.entries() ) {
    try {
      const document = JSON.parse(line);
      if ( !document._id || !document.name || !document.type || !document.system ) {
        failures.push(`Malformed compendium document in ${pack.name} at line ${index + 1}`);
      }
      if ( ids.has(document._id) ) failures.push(`Duplicate compendium _id ${document._id} in ${pack.name}`);
      ids.add(document._id);
      if ( !(document.type in (system.documentTypes?.Item ?? {})) ) {
        failures.push(`Pack ${pack.name} uses undeclared Item type ${document.type} (${document.name})`);
      }
    } catch ( err ) {
      failures.push(`Invalid JSON in ${pack.name} at line ${index + 1}: ${err.message}`);
    }
  }
  compendiumIds.set(pack.name, ids);
  compendiumDocuments += lines.length;
  if ( contentManifest?.counts?.[pack.name] !== undefined && contentManifest.counts[pack.name] !== lines.length ) {
    failures.push(`Pack count mismatch for ${pack.name}: expected ${contentManifest.counts[pack.name]}, found ${lines.length}`);
  }

  const srcDir = path.join(ROOT, "packs-src", pack.name);
  const sourceCount = fs.existsSync(srcDir) ? fs.readdirSync(srcDir).filter(name => name.endsWith(".json")).length : -1;
  if ( sourceCount !== lines.length ) failures.push(`Pack/source mismatch for ${pack.name}: ${lines.length} packed, ${sourceCount} source files`);
}
if ( contentManifest?.total !== undefined && contentManifest.total !== compendiumDocuments ) {
  failures.push(`Total content count mismatch: expected ${contentManifest.total}, found ${compendiumDocuments}`);
}

// Validate UUID links between generated compendium documents. Broken ItemGrant/ItemChoice links make
// character creation look successful while silently failing when the user chooses content.
let compendiumReferences = 0;
const compendiumRefPattern = /Compendium\.dragons-and-ballz\.([\w-]+)\.Item\.([A-Za-z0-9]+)/g;
for ( const pack of system.packs ?? [] ) {
  const srcDir = path.join(ROOT, "packs-src", pack.name);
  if ( !fs.existsSync(srcDir) ) continue;
  for ( const file of fs.readdirSync(srcDir).filter(name => name.endsWith(".json")) ) {
    const text = fs.readFileSync(path.join(srcDir, file), "utf8");
    for ( const match of text.matchAll(compendiumRefPattern) ) {
      compendiumReferences++;
      const [, targetPack, id] = match;
      if ( !compendiumIds.get(targetPack)?.has(id) ) {
        failures.push(`Broken compendium UUID in ${pack.name}/${file}: ${match[0]}`);
      }
    }
  }
}

const textExtensions = new Set([".mjs", ".js", ".json", ".hbs", ".html", ".css", ".less", ".md"]);
const files = walk(ROOT).filter(file => textExtensions.has(path.extname(file)));
const oldPathHits = [];
const oldSettingsHits = [];
const oldTemplateFlagHits = [];
const inheritedSystemPath = `systems/${"dnd5e"}/`;

for ( const file of files ) {
  const relative = path.relative(ROOT, file);
  if ( relative === path.join("scripts", "validate-system.mjs") ) continue;
  const text = fs.readFileSync(file, "utf8");
  if ( text.includes(inheritedSystemPath) ) oldPathHits.push(relative);
  if ( /game\.settings\.(?:get|set|register|registerMenu)\(\s*["']dnd5e["']/.test(text) ) {
    oldSettingsHits.push(relative);
  }
  if ( relative.startsWith(`templates${path.sep}`) && text.includes("flags.dnd5e") ) {
    oldTemplateFlagHits.push(relative);
  }
}

if ( oldPathHits.length ) failures.push(`Old inherited system paths remain in: ${oldPathHits.join(", ")}`);
if ( oldSettingsHits.length ) failures.push(`Old dnd5e settings namespace remains in: ${oldSettingsHits.join(", ")}`);
if ( oldTemplateFlagHits.length ) failures.push(`Old dnd5e template flags remain in: ${oldTemplateFlagHits.join(", ")}`);


// Validate local asset references used by the loaded stylesheet and explicit system URLs.
const assetExtensions = new Set([
  ".avif", ".gif", ".ico", ".jpeg", ".jpg", ".otf", ".png", ".svg", ".ttf", ".webp", ".woff", ".woff2"
]);
const missingAssets = new Map();
const noteMissingAsset = (asset, source) => {
  if ( !missingAssets.has(asset) ) missingAssets.set(asset, new Set());
  missingAssets.get(asset).add(source);
};
const checkLocalAsset = (asset, source, baseDirectory=ROOT) => {
  asset = asset.trim().replace(/^['"]|['"]$/g, "");
  if ( !asset || asset.startsWith("data:") || asset.startsWith("http:") || asset.startsWith("https:")
    || asset.startsWith("var(") || asset.startsWith("#") ) return;
  asset = asset.split(/[?#]/, 1)[0];
  let target;
  const prefix = `systems/${SYSTEM_ID}/`;
  if ( asset.startsWith(prefix) ) target = path.join(ROOT, asset.slice(prefix.length));
  else if ( asset.startsWith("/") ) return; // Foundry/Core absolute URL, not owned by this system.
  else target = path.resolve(baseDirectory, asset);
  if ( assetExtensions.has(path.extname(target).toLowerCase()) && !fs.existsSync(target) ) {
    noteMissingAsset(asset, source);
  }
};

for ( const style of system.styles ?? [] ) {
  const stylePath = path.join(ROOT, style);
  if ( !fs.existsSync(stylePath) ) {
    failures.push(`Stylesheet listed in system.json does not exist: ${style}`);
    continue;
  }
  const css = fs.readFileSync(stylePath, "utf8");
  for ( const match of css.matchAll(/url\(\s*([^)]+?)\s*\)/g) ) {
    checkLocalAsset(match[1], style, path.dirname(stylePath));
  }
}

// Explicit system asset paths in runtime templates/source must resolve locally. Ignore migration/mapping data because those
// files intentionally contain historical asset aliases that are not loaded by the standard character sheet.
const runtimeAssetFiles = files.filter(file => {
  const relative = path.relative(ROOT, file);
  return !relative.startsWith(`json${path.sep}`) && !relative.startsWith(`utils${path.sep}`);
});
const explicitAssetPattern = new RegExp(`systems/${SYSTEM_ID}/[^\\"'\`<>\s)]+`, "g");
for ( const file of runtimeAssetFiles ) {
  const relative = path.relative(ROOT, file);
  const text = fs.readFileSync(file, "utf8");
  for ( const match of text.matchAll(explicitAssetPattern) ) checkLocalAsset(match[0], relative);
}

if ( missingAssets.size ) {
  const details = [...missingAssets.entries()]
    .map(([asset, sources]) => `${asset} (${[...sources].slice(0, 3).join(", ")})`)
    .join("; ");
  failures.push(`Missing local runtime assets: ${details}`);
}

const main = read(`${SYSTEM_ID}.mjs`);
const helperRegistration = main.indexOf("utils.registerHandlebarsHelpers();");
const settingsRegistration = main.indexOf("registerSystemSettings();");
if ( helperRegistration < 0 ) failures.push("Handlebars helper registration is missing from main module");
else if ( settingsRegistration >= 0 && helperRegistration > settingsRegistration ) {
  failures.push("Handlebars helpers are registered too late (after settings initialization)");
}

const templates = walk(path.join(ROOT, "templates")).filter(file => file.endsWith(".hbs"));
const helperPattern = /{{[#/~]?\s*(dnd5e-[\w-]+)/g;
const usedHelpers = new Set();
for ( const file of templates ) {
  const text = fs.readFileSync(file, "utf8");
  for ( const match of text.matchAll(helperPattern) ) usedHelpers.add(match[1]);
}
const utils = read("module/utils.mjs");
const registeredHelpers = new Set(
  Array.from(utils.matchAll(/["'](dnd5e-[\w-]+)["']\s*:/g), match => match[1])
);
const missingHelpers = [...usedHelpers].filter(helper => !registeredHelpers.has(helper));
if ( missingHelpers.length ) failures.push(`Template helpers used but not registered: ${missingHelpers.join(", ")}`);

if ( failures.length ) {
  console.error("Dragons and BallZ validation FAILED:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(`Dragons and BallZ ${system.version} validation passed.`);
console.log(`Checked ${files.length} text/source files and ${templates.length} Handlebars templates.`);
console.log(`Registered dnd5e-compatible template helpers: ${registeredHelpers.size}; used: ${usedHelpers.size}.`);
console.log(`Validated ${compendiumDocuments} handbook-backed compendium items and ${compendiumReferences} compendium UUID links.`);

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const system = JSON.parse(fs.readFileSync(path.join(ROOT, "system.json"), "utf8"));
const sourceRoot = path.join(ROOT, "packs-src");
let total = 0;

for ( const pack of system.packs ?? [] ) {
  const srcDir = path.join(sourceRoot, pack.name);
  if ( !fs.existsSync(srcDir) ) throw new Error(`Missing pack source directory: packs-src/${pack.name}`);

  const documents = fs.readdirSync(srcDir)
    .filter(name => name.endsWith(".json"))
    .map(name => JSON.parse(fs.readFileSync(path.join(srcDir, name), "utf8")))
    .sort((a, b) => {
      const al = a.flags?.[system.id]?.handbook?.startLine ?? Number.MAX_SAFE_INTEGER;
      const bl = b.flags?.[system.id]?.handbook?.startLine ?? Number.MAX_SAFE_INTEGER;
      return (al - bl) || a.name.localeCompare(b.name) || a._id.localeCompare(b._id);
    });

  const ids = new Set();
  for ( const document of documents ) {
    if ( !document._id || !document.name || !document.type || !document.system ) {
      throw new Error(`Malformed document in ${pack.name}: ${document.name ?? document._id ?? "unknown"}`);
    }
    if ( ids.has(document._id) ) throw new Error(`Duplicate _id ${document._id} in ${pack.name}`);
    ids.add(document._id);
  }

  const relative = (pack.path ?? `./packs/${pack.name}.db`).replace(/^\.\//, "");
  const target = path.join(ROOT, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, documents.map(d => JSON.stringify(d)).join("\n") + (documents.length ? "\n" : ""), "utf8");
  console.log(`${pack.name}: ${documents.length} items -> ${relative}`);
  total += documents.length;
}

console.log(`Built ${total} handbook-backed compendium items.`);

// Converte as cifras existentes para ChordPro, com verificação.
//
//   node scripts/migrate-chordpro.js                 -> SIMULAÇÃO (não grava nada)
//   node scripts/migrate-chordpro.js --apply         -> grava o campo `chordpro`
//   node scripts/migrate-chordpro.js --limit 20      -> só as 20 primeiras
//   node scripts/migrate-chordpro.js --out relatorio.json
//
// Segurança:
// - `observacao` (o texto original) NUNCA é alterado: só os campos novos `chordpro`
//   e `chordproHash` (hash do texto de que o ChordPro veio; a API só usa o ChordPro se bater).
// - Só grava se a conversão passar na verificação (a tela enxerga o mesmo).
// - Sem --apply nada é escrito no banco.
// - Para desfazer: db.cifras.updateMany({}, { $unset: { chordpro: "", chordproHash: "" } })

import "dotenv/config";
import fs from "node:fs";
import mongoose from "mongoose";
import connectDatabase from "../src/database/database.js";
import Cifra from "../src/models/Cifra.js";
import { convertAndVerify } from "../src/utils/chordpro.js";
import { hashText } from "../src/utils/chordproFresh.js";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : 0;
const outIdx = args.indexOf("--out");
const outFile = outIdx >= 0 ? args[outIdx + 1] : null;

await connectDatabase();

const filter = { observacao: { $type: "string", $ne: "" } };
let query = Cifra.find(filter).select("nome artista observacao chordpro chordproHash").lean();
if (limit > 0) query = query.limit(limit);
const cifras = await query;

const stats = { total: cifras.length, convertidas: 0, jaEstavamOk: 0, revisar: 0, gravadas: 0 };
const motivos = {};
const revisar = [];
const ops = [];

for (const c of cifras) {
  const r = convertAndVerify(c.observacao);
  if (!r.ok) {
    stats.revisar++;
    motivos[r.reason] = (motivos[r.reason] || 0) + 1;
    revisar.push({ id: String(c._id), nome: c.nome, artista: c.artista || "", motivo: r.reason });
    continue;
  }
  stats.convertidas++;
  const hash = hashText(c.observacao);
  if (c.chordpro === r.chordpro && c.chordproHash === hash) {
    stats.jaEstavamOk++;
    continue;
  }
  ops.push({ updateOne: { filter: { _id: c._id }, update: { $set: { chordpro: r.chordpro, chordproHash: hash } } } });
}

if (apply && ops.length) {
  const res = await Cifra.bulkWrite(ops, { ordered: false });
  stats.gravadas = res.modifiedCount;
}

console.log(apply ? "== APLICADO ==" : "== SIMULAÇÃO (nada foi gravado) ==");
console.log(stats);
if (Object.keys(motivos).length) console.log("Motivos para revisar:", motivos);
if (revisar.length) {
  console.log(`\nPrimeiras ${Math.min(revisar.length, 15)} cifras para revisar:`);
  revisar.slice(0, 15).forEach((x) => console.log(` - ${x.nome}${x.artista ? ` (${x.artista})` : ""}: ${x.motivo}`));
}
if (outFile) {
  fs.writeFileSync(outFile, JSON.stringify({ stats, motivos, revisar }, null, 2));
  console.log(`\nRelatório completo em ${outFile}`);
}

await mongoose.disconnect();

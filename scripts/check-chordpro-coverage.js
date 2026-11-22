// Mede quantas cifras já têm ChordPro VÁLIDO (em dia com o texto). Só lê, nunca grava.
//
//   node scripts/check-chordpro-coverage.js
//
// Serve para decidir quando dá para remover o caminho antigo de exibição/transposição
// (texto -> transposeText -> parseCifraText) no frontend: só quando "sem ChordPro válido" for 0.
// As cifras listadas não passaram na conversão verificada (ou nunca foram convertidas);
// para tentar de novo rode scripts/migrate-chordpro.js.

import "dotenv/config";
import mongoose from "mongoose";
import connectDatabase from "../src/database/database.js";
import Cifra from "../src/models/Cifra.js";
import { freshChordPro } from "../src/utils/chordproFresh.js";

await connectDatabase();

let total = 0;
const semChordPro = [];
for await (const c of Cifra.find({}).select("nome artista observacao chordpro chordproHash").lean()) {
  total += 1;
  if (!c.observacao?.trim()) continue; // sem texto: nada a converter
  if (!freshChordPro(c)) semChordPro.push(`${c._id}  ${c.nome}${c.artista ? ` — ${c.artista}` : ""}`);
}

console.log(`Cifras: ${total}`);
console.log(`Com ChordPro válido: ${total - semChordPro.length}`);
console.log(`Sem ChordPro válido (usam o caminho antigo): ${semChordPro.length}`);
if (semChordPro.length) {
  console.log("\n" + semChordPro.slice(0, 50).join("\n"));
  if (semChordPro.length > 50) console.log(`... e mais ${semChordPro.length - 50}`);
}

await mongoose.disconnect();

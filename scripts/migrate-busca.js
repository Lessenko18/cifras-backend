// Preenche `nomeBusca` e `artistaBusca` (nome/artista sem acento e em minúsculas) nas
// cifras que já existiam, para a busca ignorar acentos.
//
//   node scripts/migrate-busca.js           -> SIMULAÇÃO (não grava nada)
//   node scripts/migrate-busca.js --apply   -> grava os campos
//
// Não altera `updatedAt` (os campos são só de busca). Idempotente: só altera cifras cujo valor calculado difere do guardado.
// Até rodar, a busca continua achando essas cifras pelo jeito antigo (com acento).

import "dotenv/config";
import mongoose from "mongoose";
import connectDatabase from "../src/database/database.js";
import Cifra from "../src/models/Cifra.js";
import { normalizeBusca } from "../src/utils/normalizeBusca.js";

const apply = process.argv.slice(2).includes("--apply");

await connectDatabase();

const ops = [];
let total = 0;
for await (const cifra of Cifra.find({}).select("nome artista nomeBusca artistaBusca").lean()) {
  total += 1;
  const nomeBusca = normalizeBusca(cifra.nome);
  const artistaBusca = normalizeBusca(cifra.artista);
  if (cifra.nomeBusca !== nomeBusca || cifra.artistaBusca !== artistaBusca) {
    ops.push({ updateOne: { filter: { _id: cifra._id }, update: { $set: { nomeBusca, artistaBusca } } } });
  }
}

console.log(`${total} cifras; ${ops.length} precisam de atualização.`);
if (apply && ops.length) {
  const result = await Cifra.bulkWrite(ops, { ordered: false, timestamps: false }); // não mexe no updatedAt
  console.log(`Atualizadas: ${result.modifiedCount}`);
} else if (!apply) {
  console.log("Simulação: nada foi gravado. Use --apply para gravar.");
}

await mongoose.disconnect();

// Move `users.favoritos` para a coleção `favoritos` e remove `users.playlists`.
//
//   node scripts/migrate-favoritos.js                  -> SIMULAÇÃO (não grava nada)
//   node scripts/migrate-favoritos.js --apply          -> copia os favoritos para a coleção nova
//   node scripts/migrate-favoritos.js --apply --unset  -> também apaga users.favoritos e users.playlists
//
// Ordem recomendada em produção:
// 1. rode com --apply ANTES de publicar o código novo (só copia; o código antigo segue funcionando);
// 2. publique o código novo;
// 3. rode com --apply --unset para limpar os campos antigos.
//
// Segurança:
// - Idempotente: pode rodar várias vezes (índice único (user, cifra) descarta repetidos).
// - Ids de cifras que não existem mais são ignorados (e contados no relatório).
// - Sem --apply nada é escrito. --unset sozinho não faz nada.
// - Para desfazer o --unset é preciso restaurar do backup: o campo antigo some.

import "dotenv/config";
import mongoose from "mongoose";
import connectDatabase from "../src/database/database.js";
import Favorito from "../src/models/Favorito.js";
import Cifra from "../src/models/Cifra.js";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const unset = apply && args.includes("--unset");

await connectDatabase();

// O schema novo não tem mais esses campos: lê direto da coleção.
const users = mongoose.connection.collection("users");
const legacy = await users
  .find({ $or: [{ favoritos: { $exists: true } }, { playlists: { $exists: true } }] })
  .project({ favoritos: 1, playlists: 1 })
  .toArray();

const stats = {
  usuariosComCampoAntigo: legacy.length,
  favoritosNoArray: 0,
  orfaos: 0,
  jaMigrados: 0,
  criados: 0,
  playlistsNoArray: 0,
  camposRemovidos: 0,
};

const referenced = new Set();
for (const u of legacy) {
  for (const id of u.favoritos || []) referenced.add(String(id));
}
const existing = new Set(
  (await Cifra.find({ _id: { $in: [...referenced] } }).select("_id").lean()).map((c) => String(c._id)),
);

const docs = [];
for (const u of legacy) {
  stats.playlistsNoArray += (u.playlists || []).length;
  const seen = new Set();
  for (const id of u.favoritos || []) {
    stats.favoritosNoArray++;
    const key = String(id);
    if (seen.has(key)) continue;
    seen.add(key);
    if (!existing.has(key)) {
      stats.orfaos++;
      continue;
    }
    docs.push({ user: u._id, cifra: id });
  }
}

// Pares que já estão na coleção nova (rodada anterior): não inserir de novo.
const pairKey = (d) => `${d.user}:${d.cifra}`;
const already = new Set(
  (await Favorito.find({ user: { $in: legacy.map((u) => u._id) } }).select("user cifra").lean()).map(pairKey),
);
const toInsert = docs.filter((d) => !already.has(pairKey(d)));
stats.jaMigrados = docs.length - toInsert.length;
stats.criados = toInsert.length;

if (apply) {
  await Favorito.init(); // cria o índice único antes de inserir
  if (toInsert.length) await Favorito.insertMany(toInsert);

  if (unset) {
    const res = await users.updateMany({}, { $unset: { favoritos: "", playlists: "" } });
    stats.camposRemovidos = res.modifiedCount;
  }
}

console.log(apply ? "== APLICADO ==" : "== SIMULAÇÃO (nada foi gravado) ==");
console.log(stats);
if (!apply) console.log("(criados = quantos seriam criados nesta rodada)");
if (apply && !unset) console.log("Campos antigos mantidos. Depois de publicar o código novo, rode com --apply --unset.");

await mongoose.disconnect();

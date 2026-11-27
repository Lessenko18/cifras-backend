import "dotenv/config";
import mongoose from "mongoose";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("Sem DATABASE_URL"); process.exit(1); }

await mongoose.connect(DATABASE_URL, { serverSelectionTimeoutMS: 15000 });

const db = mongoose.connection.db;
const col = (n) => db.collection(n);

function monthKey(date) {
  return date.toISOString().slice(0,7); // YYYY-MM
}

async function countsByMonth(collectionName, dateField = "createdAt") {
  const docs = await col(collectionName).find({}, { projection: { [dateField]: 1 } }).toArray();
  const counts = {};
  for (const d of docs) {
    const dt = d[dateField];
    if (!dt) continue;
    const k = monthKey(new Date(dt));
    counts[k] = (counts[k] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort());
}

const report = {};

// Users
const totalUsers = await col("users").countDocuments();
const admUsers = await col("users").countDocuments({ level: "ADM" });
report.users = {
  total: totalUsers,
  adm: admUsers,
  comuns: totalUsers - admUsers,
  porMes: await countsByMonth("users"),
};

// Cifras
const totalCifras = await col("cifras").countDocuments();
const acessosAgg = await col("cifras").aggregate([
  { $group: { _id: null, totalAcessos: { $sum: "$acessos" }, totalAcessosMes: { $sum: "$acessosMes" } } }
]).toArray();
const topCifras = await col("cifras").find({}, { projection: { nome: 1, artista: 1, acessos: 1 } })
  .sort({ acessos: -1 }).limit(10).toArray();
report.cifras = {
  total: totalCifras,
  totalAcessosHistorico: acessosAgg[0]?.totalAcessos || 0,
  totalAcessosMesAtual: acessosAgg[0]?.totalAcessosMes || 0,
  porMes: await countsByMonth("cifras"),
  top10MaisAcessadas: topCifras.map(c => ({ nome: c.nome, artista: c.artista, acessos: c.acessos || 0 })),
};

// Categorias
report.categorias = { total: await col("categorias").countDocuments() };

// Playlists
const totalPlaylists = await col("playlists").countDocuments();
const playlistsComLinkPublico = await col("playlists").countDocuments({ publicSlug: { $exists: true, $ne: null } });
const playlistsCompartilhadas = await col("playlists").countDocuments({ "sharedWith.0": { $exists: true } });
const playlistsAgg = await col("playlists").aggregate([
  { $project: { numCifras: { $size: { $ifNull: ["$cifras", []] } } } },
  { $group: { _id: null, mediaCifras: { $avg: "$numCifras" } } }
]).toArray();
report.playlists = {
  total: totalPlaylists,
  comLinkPublico: playlistsComLinkPublico,
  compartilhadasComOutros: playlistsCompartilhadas,
  mediaCifrasPorPlaylist: Math.round((playlistsAgg[0]?.mediaCifras || 0) * 10) / 10,
  porMes: await countsByMonth("playlists"),
};

// Favoritos
report.favoritos = { total: await col("favoritos").countDocuments() };

// Feedback
const feedbackPorTipo = await col("feedbacks").aggregate([
  { $group: { _id: "$tipo", count: { $sum: 1 } } }
]).toArray();
report.feedback = {
  total: await col("feedbacks").countDocuments(),
  naoLidos: await col("feedbacks").countDocuments({ lido: false }),
  porTipo: Object.fromEntries(feedbackPorTipo.map(f => [f._id, f.count])),
};

// Audit log activity (últimos 30/90 dias) - expira em 180 dias, então é só atividade recente
const now = new Date();
const d30 = new Date(now - 30*24*60*60*1000);
const d90 = new Date(now - 90*24*60*60*1000);
report.atividadeAdministrativa = {
  acoesUltimos30Dias: await col("auditlogs").countDocuments({ createdAt: { $gte: d30 } }),
  acoesUltimos90Dias: await col("auditlogs").countDocuments({ createdAt: { $gte: d90 } }),
};

console.log(JSON.stringify(report, null, 2));

await mongoose.disconnect();
process.exit(0);

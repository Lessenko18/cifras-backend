import Cifra from "../models/Cifra.js";

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function createCifraRepository(data) {
  return Cifra.create(data);
}

async function updateCifraRepository(id, data) {
  return Cifra.findOneAndUpdate({ _id: id }, data, { new: true });
}

async function deleteCifraRepository(id) {
  return Cifra.findByIdAndDelete(id);
}

// Suporta filtros opcionais: nome/artista, categorias (array de IDs), favoritos (array de IDs), page, limit
async function getAllCifraRepository({ nome, artista, categorias, favoritos, page = 0, limit = 15 } = {}) {
  const query = {};

  if (nome) {
    const safe = escapeRegex(nome.trim());
    query.$or = [
      { nome: { $regex: safe, $options: "i" } },
      { artista: { $regex: safe, $options: "i" } },
    ];
  }

  if (artista) {
    query.artista = { $regex: `^${escapeRegex(artista.trim())}$`, $options: "i" };
  }

  if (favoritos && favoritos.length > 0) {
    query._id = { $in: favoritos };
  }

  if (categorias && categorias.length > 0) {
    query.categorias = { $in: categorias };
  }

  const skip = page * limit;

  const [cifras, total] = await Promise.all([
    Cifra.find(query)
      .collation({ locale: "pt", strength: 1 })
      .sort({ nome: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Cifra.countDocuments(query),
  ]);

  return { cifras, total, pages: Math.ceil(total / limit), page };
}

async function getCifraByIdRepository(id) {
  return Cifra.findById(id).lean();
}

function getMesRef(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// Incrementa o total histórico sempre, e o contador do mês corrente (zerando-o
// preguiçosamente quando o último acesso registrado foi em um mês diferente).
async function incrementAcessosRepository(id) {
  const mesRef = getMesRef();

  const updated = await Cifra.findOneAndUpdate(
    { _id: id, acessosMesRef: mesRef },
    { $inc: { acessos: 1, acessosMes: 1 } },
    { new: true },
  ).lean();
  if (updated) return updated;

  return Cifra.findByIdAndUpdate(
    id,
    { $inc: { acessos: 1 }, $set: { acessosMesRef: mesRef, acessosMes: 1 } },
    { new: true },
  ).lean();
}

async function getMaisAcessadasRepository(limit = 6) {
  return Cifra.find({ acessos: { $gt: 0 } })
    .sort({ acessos: -1, nome: 1 })
    .limit(limit)
    .lean();
}

async function getMaisAcessadasMesRepository(limit = 6) {
  const mesRef = getMesRef();
  return Cifra.find({ acessosMesRef: mesRef, acessosMes: { $gt: 0 } })
    .sort({ acessosMes: -1, nome: 1 })
    .limit(limit)
    .lean();
}

async function getNovasRepository(limit = 6) {
  return Cifra.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

async function getArtistasMaisAcessadosRepository(limit = 6) {
  return Cifra.aggregate([
    { $match: { artista: { $nin: [null, ""] } } },
    {
      $group: {
        _id: { $toLower: "$artista" },
        artista: { $first: "$artista" },
        acessos: { $sum: "$acessos" },
        musicas: { $sum: 1 },
      },
    },
    { $match: { acessos: { $gt: 0 } } },
    { $sort: { acessos: -1, artista: 1 } },
    { $limit: limit },
    { $project: { _id: 0, artista: 1, acessos: 1, musicas: 1 } },
  ]);
}

export default {
  createCifraRepository,
  getAllCifraRepository,
  getCifraByIdRepository,
  updateCifraRepository,
  deleteCifraRepository,
  incrementAcessosRepository,
  getMaisAcessadasRepository,
  getMaisAcessadasMesRepository,
  getNovasRepository,
  getArtistasMaisAcessadosRepository,
};

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
async function getAllCifraRepository({ nome, categorias, favoritos, page = 0, limit = 15 } = {}) {
  const query = {};

  if (nome) {
    const safe = escapeRegex(nome.trim());
    query.$or = [
      { nome: { $regex: safe, $options: "i" } },
      { artista: { $regex: safe, $options: "i" } },
    ];
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

export default {
  createCifraRepository,
  getAllCifraRepository,
  getCifraByIdRepository,
  updateCifraRepository,
  deleteCifraRepository,
};

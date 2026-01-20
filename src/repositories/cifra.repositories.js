import Cifra from "../models/Cifra.js";

async function createCifraRepository(data) {
  return Cifra.create(data);
}

async function updateCifraRepository(id, data) {
  return Cifra.findOneAndUpdate({ _id: id }, data, { new: true });
}

async function deleteCifraRepository(id) {
  return Cifra.findByIdAndDelete(id);
}

async function getAllCifraRepository() {
  return Cifra.find().sort({ _id: -1 });
}

async function getCifraByIdRepository(id) {
  return Cifra.findById(id);
}

async function searchCifraRepository(nome) {
  if (!nome || typeof nome !== "string") {
    return [];
  }

  return Cifra.find({
    nome: { $regex: nome.trim(), $options: "i" },
  })
    .collation({ locale: "pt", strength: 1 })
    .sort({ nome: 1 });
}

async function getCifraByCategoriaRepository(categoria) {
  return Cifra.find({ categoria }).sort({ nome: 1 });
}

export default {
  createCifraRepository,
  getAllCifraRepository,
  getCifraByIdRepository,
  updateCifraRepository,
  deleteCifraRepository,
  searchCifraRepository,
  getCifraByCategoriaRepository,
};

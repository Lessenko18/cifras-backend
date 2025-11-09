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
  return Cifra.find().select("_id nome").sort({ _id: -1 });
}

async function getCifraByIdRepository(id) {
  return Cifra.findById(id);
}
async function searchCifraRepository(nome) {
  return Cifra.find({
    nome: { $regex: nome.nome, $options: "i" }, // case insensitive
  }).select("_id nome")
    .collation({ locale: "pt", strength: 1 }) // ignora acentos
    .sort({ nome: 1 });
}
async function getCifraByCategoriaRepository(categoria) {
  try {
    return await Cifra.find({ categoria: categoria }).select("_id nome").sort({ nome: 1 });
  } catch (error) {
    throw new Error("Erro ao buscar cifras por categoria");
  }
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

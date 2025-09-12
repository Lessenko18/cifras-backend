import Categoria from "../models/Categoria.js";

async function createCategoriaRepository(data) {
  return Categoria.create(data);
}

async function updateCategoriaRepository(id, data) {
  return Categoria.findOneAndUpdate({ _id: id }, data, { new: true });
}

async function deleteCategoriaRepository(id) {
  return Categoria.findByIdAndDelete(id);
}

async function getAllCategoriaRepository() {
  return Categoria.find().sort({ _id: -1 });
}

async function searchCategoriaRepository(nome) {
  return Categoria.find({
    nome: { $regex: nome.nome, $options: "i" }, // case insensitive
  })
    .collation({ locale: "pt", strength: 1 }) // ignora acentos
    .sort({ nome: 1 });
}

async function getCategoriaByIdRepository(id) {
  return Categoria.findById(id);
}

export default {
  createCategoriaRepository,
  getAllCategoriaRepository,
  getCategoriaByIdRepository,
  updateCategoriaRepository,
  deleteCategoriaRepository,
  searchCategoriaRepository,
};

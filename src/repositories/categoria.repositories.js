import Categoria from "../models/Categoria.js";

async function createCategoriaRepository(data) {
  return Categoria.create(data);
}

async function updateCategoriaRepository(id, data) {
  return Categoria.findOneAndUpdate({ _id: id }, data, { new: true }).populate("parent", "nome");
}

async function deleteCategoriaRepository(id) {
  return Categoria.findByIdAndDelete(id);
}

async function getAllCategoriaRepository() {
  return Categoria.find().populate("parent", "nome").sort({ nome: 1 });
}

async function searchCategoriaRepository(nome) {
  if (!nome || nome.trim().length < 1) {
    return [];
  }

  return Categoria.find({
    nome: { $regex: nome.trim(), $options: "i" },
  })
    .populate("parent", "nome")
    .collation({ locale: "pt", strength: 1 })
    .sort({ nome: 1 });
}

async function getCategoriaByIdRepository(id) {
  return Categoria.findById(id).populate("parent", "nome");
}

async function getChildrenCountRepository(parentId) {
  return Categoria.countDocuments({ parent: parentId });
}

export default {
  createCategoriaRepository,
  getAllCategoriaRepository,
  getCategoriaByIdRepository,
  updateCategoriaRepository,
  deleteCategoriaRepository,
  searchCategoriaRepository,
  getChildrenCountRepository,
};

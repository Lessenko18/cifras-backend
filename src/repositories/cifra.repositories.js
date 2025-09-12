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

export default {
  createCifraRepository,
  getAllCifraRepository,
  getCifraByIdRepository,
  updateCifraRepository,
  deleteCifraRepository,
};

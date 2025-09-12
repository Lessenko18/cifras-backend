import cifraRepositories from "../repositories/cifra.repositories.js";
import playlistRepositories from "../repositories/playlist.repositories.js";

async function createCifraService(data) {
  const cifra = await cifraRepositories.createCifraRepository(data);
  return cifra;
}

async function updateCifraService(id, data) {
  const cifra = await cifraRepositories.getCifraByIdRepository(id);
  if (!cifra) throw new Error("Cifra não encontrada");
  const cifraAt = await cifraRepositories.updateCifraRepository(id, data);
  return cifraAt;
}

export async function deleteCifraService(id) {
  const cifra = await cifraRepositories.getCifraByIdRepository(id);
  if (!cifra) throw new Error("Cifra não encontrada");

  const result = await playlistRepositories.removeCifraFromAllPlaylists(id);

  await cifraRepositories.deleteCifraRepository(id);

  return {
    message: "Cifra deletada com sucesso",
  };
}

async function getAllCifraService() {
  const cifras = await cifraRepositories.getAllCifraRepository();
  if (cifras.length == 0) return { message: "Nenhuma cifra cadastrada" };

  return cifras;
}

async function getCifraById(id) {
  const cifra = await cifraRepositories.getCifraByIdRepository(id);
  if (!cifra) throw new Error("Cifra não encontrada");

  return cifra;
}

export default {
  createCifraService,
  getAllCifraService,
  getCifraById,
  updateCifraService,
  deleteCifraService,
};

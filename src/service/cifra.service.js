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
async function searchCifraService(nome) {
  const cifras = await cifraRepositories.searchCifraRepository(nome);
  console.log(cifras);
  if (cifras.length == 0) return { message: "Nenhuma Cifra cadastrada" };
  return cifras;
}
async function getCifraByCategoriaService(categoria) {
  const cifras = await cifraRepositories.getCifraByCategoriaRepository(
    categoria
  );
  if (!cifras || cifras.length === 0)
    throw new Error("Nenhuma Cifra cadastrada");

  return cifras;
}
export default {
  createCifraService,
  getAllCifraService,
  getCifraById,
  updateCifraService,
  deleteCifraService,
  searchCifraService,
  getCifraByCategoriaService,
};

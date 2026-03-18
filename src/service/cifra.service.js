import cifraRepositories from "../repositories/cifra.repositories.js";
import playlistRepositories from "../repositories/playlist.repositories.js";

async function createCifraService(data, requesterId) {
  const payload = {
    ...data,
    createdBy: requesterId,
  };

  const cifra = await cifraRepositories.createCifraRepository(payload);
  return cifra;
}

async function updateCifraService(id, data, requesterContext) {
  const cifra = await cifraRepositories.getCifraByIdRepository(id);
  if (!cifra) throw new Error("Cifra não encontrada");

  const requesterId = requesterContext?.requesterId;
  const requesterLevel = requesterContext?.requesterLevel;

  if (requesterLevel !== "ADM") {
    const createdBy = cifra.createdBy?.toString();

    if (!createdBy || createdBy !== requesterId) {
      const error = new Error(
        "Usuário comum não pode editar cifras criadas por outros usuários",
      );
      error.statusCode = 403;
      throw error;
    }
  }

  const safeData = { ...data };
  delete safeData.createdBy;

  const cifraAt = await cifraRepositories.updateCifraRepository(id, safeData);
  return cifraAt;
}

export async function deleteCifraService(id, requesterContext) {
  const cifra = await cifraRepositories.getCifraByIdRepository(id);
  if (!cifra) throw new Error("Cifra não encontrada");

  const requesterId = requesterContext?.requesterId;
  const requesterLevel = requesterContext?.requesterLevel;

  if (requesterLevel !== "ADM") {
    const createdBy = cifra.createdBy?.toString();

    if (!createdBy || createdBy !== requesterId) {
      const error = new Error(
        "Usuário comum não pode excluir cifras criadas por outros usuários",
      );
      error.statusCode = 403;
      throw error;
    }
  }

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
  if (cifras.length == 0) return { message: "Nenhuma Cifra cadastrada" };
  return cifras;
}
async function getCifraByCategoriaService(categoria) {
  const cifras =
    await cifraRepositories.getCifraByCategoriaRepository(categoria);
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

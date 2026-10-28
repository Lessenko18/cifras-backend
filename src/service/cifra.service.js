import cifraRepositories from "../repositories/cifra.repositories.js";
import playlistRepositories from "../repositories/playlist.repositories.js";
import { cleanText } from "../utils/cleanText.js";

// Só estes campos vêm do cliente. Contadores (acessos*), createdBy etc. são
// controlados pelo servidor — senão dava pra forjar o ranking de mais acessadas.
function assertHttpUrl(value) {
  try {
    const { protocol } = new URL(value);
    if (protocol === "http:" || protocol === "https:") return;
  } catch {
    // cai no erro abaixo
  }
  const error = new Error("O link da cifra deve começar com http:// ou https://");
  error.statusCode = 400;
  throw error;
}

function pickCifraFields(data) {
  const picked = {};
  for (const field of ["nome", "artista", "link", "observacao"]) {
    if (typeof data?.[field] === "string") picked[field] = cleanText(data[field]);
  }
  // Evita "javascript:" e afins em links que viram <a href> no front
  if (picked.link !== undefined) {
    let link = picked.link.trim();
    // Link colado sem "https://" (ex: "www.cifraclub.com.br/x") ganha o esquema
    if (link && !/^[a-z][a-z0-9+.-]*:/i.test(link)) link = `https://${link}`;
    if (link) assertHttpUrl(link);
    picked.link = link;
  }
  if (data?.bpm !== undefined && data.bpm !== null && data.bpm !== "") {
    picked.bpm = Number(data.bpm);
  }
  if (Array.isArray(data?.categorias)) {
    picked.categorias = data.categorias.filter((c) => typeof c === "string");
  }
  return picked;
}

async function createCifraService(rawData, requesterId) {
  const data = pickCifraFields(rawData);
  const duplicate = await cifraRepositories.findDuplicateCifraRepository(
    String(data?.nome || ""),
    String(data?.artista || ""),
  );
  if (duplicate) {
    const error = new Error("Já existe uma cifra com esse título e artista");
    error.statusCode = 409;
    throw error;
  }

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

  const safeData = pickCifraFields(data);

  const cifraAt = await cifraRepositories.updateCifraRepository(id, safeData);
  return cifraAt;
}

async function deleteCifraService(id, requesterContext) {
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

async function getAllCifraService({ nome, artista, categorias, favoritos, page, limit } = {}) {
  return cifraRepositories.getAllCifraRepository({ nome, artista, categorias, favoritos, page, limit });
}

async function getCifraById(id) {
  const cifra = await cifraRepositories.getCifraByIdRepository(id);
  if (!cifra) throw new Error("Cifra não encontrada");

  return cifra;
}

async function registerCifraAccess(id) {
  return cifraRepositories.incrementAcessosRepository(id);
}

async function getHomeInsightsService({ limit = 6 } = {}) {
  const [maisAcessadasMes, maisAcessadas, novas, artistasMaisAcessados] = await Promise.all([
    cifraRepositories.getMaisAcessadasMesRepository(limit),
    cifraRepositories.getMaisAcessadasRepository(limit),
    cifraRepositories.getNovasRepository(limit),
    cifraRepositories.getArtistasMaisAcessadosRepository(limit),
  ]);

  return { maisAcessadasMes, maisAcessadas, novas, artistasMaisAcessados };
}

export default {
  createCifraService,
  getAllCifraService,
  getCifraById,
  updateCifraService,
  deleteCifraService,
  registerCifraAccess,
  getHomeInsightsService,
};

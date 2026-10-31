import Favorito from "../models/Favorito.js";

const DUPLICATE_KEY = 11000;

async function listFavoritosRepository(userId) {
  const docs = await Favorito.find({ user: userId }).select("cifra").sort({ createdAt: 1 }).lean();
  return docs.map((d) => d.cifra.toString());
}

// Remove se existir; senão cria. Sem ler/reescrever documento: dois toggles
// simultâneos não se atropelam (o índice único barra o segundo create).
async function toggleFavoritoRepository(userId, cifraId) {
  const removed = await Favorito.deleteOne({ user: userId, cifra: cifraId });
  if (removed.deletedCount === 0) {
    try {
      await Favorito.create({ user: userId, cifra: cifraId });
    } catch (error) {
      if (error?.code !== DUPLICATE_KEY) throw error;
    }
  }
  return listFavoritosRepository(userId);
}

async function deleteFavoritosByUserRepository(userId) {
  return Favorito.deleteMany({ user: userId });
}

async function deleteFavoritosByCifraRepository(cifraId) {
  return Favorito.deleteMany({ cifra: cifraId });
}

export default {
  listFavoritosRepository,
  toggleFavoritoRepository,
  deleteFavoritosByUserRepository,
  deleteFavoritosByCifraRepository,
};

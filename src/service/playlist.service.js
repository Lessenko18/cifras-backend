import playlistRepositories from "../repositories/playlist.repositories.js";

async function createPlaylistService(data, userId) {
  const payload = { ...data, criador: userId };
  const playlist = await playlistRepositories.createPlaylistRepository(payload);
  return playlist;
}
async function getPlaylistViewService(id, userId, isAdmin = false) {
  const playlist = await playlistRepositories.getPlaylistViewRepository(
    id,
    userId,
    isAdmin,
  );
  if (!playlist) throw new Error("Playlist não encontrada");
  return {
    nome: playlist.nome,
    musicas: (playlist.cifras || []).map((c) => ({
      id: c._id,
      nome: c.nome,
      descricao: c.observacao || "",
    })),
  };
}
async function updatePlaylistService(id, data, userId, isAdmin = false) {
  const playlist = await playlistRepositories.getPlaylistByIdRepository(
    id,
    userId,
    isAdmin,
  );
  if (!playlist) throw new Error("Playlist não encontrada");
  const playlistAt = await playlistRepositories.updatePlaylistRepository(
    id,
    data,
    userId,
    isAdmin,
  );
  return playlistAt;
}

async function deletePlaylistService(id, userId, isAdmin = false) {
  const playlist = await playlistRepositories.getPlaylistByIdRepository(
    id,
    userId,
    isAdmin,
  );
  if (!playlist) throw new Error("Playlist não encontrada");
  await playlistRepositories.deletePlaylistRepository(id, userId, isAdmin);
  return { message: "Playlist deletada com sucesso" };
}

async function getAllPlaylistService(userId, isAdmin = false) {
  const playlists = await playlistRepositories.getAllPlaylistRepository(
    userId,
    isAdmin,
  );
  if (playlists.length == 0) return [];

  return playlists;
}

async function getPlaylistById(id, userId, isAdmin = false) {
  const playlist = await playlistRepositories.getPlaylistByIdRepository(
    id,
    userId,
    isAdmin,
  );
  if (!playlist) throw new Error("Playlist não encontrada");

  return playlist;
}

export default {
  createPlaylistService,
  getAllPlaylistService,
  getPlaylistById,
  updatePlaylistService,
  deletePlaylistService,
  getPlaylistViewService,
};

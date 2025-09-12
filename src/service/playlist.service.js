import playlistRepositories from "../repositories/playlist.repositories.js";

async function createPlaylistService(data) {
  const playlist = await playlistRepositories.createPlaylistRepository(data);
  return playlist;
}

async function updatePlaylistService(id, data) {
  const playlist = await playlistRepositories.getPlaylistByIdRepository(id);
  if (!playlist) throw new Error("Playlist não encontrada");
  const playlistAt = await playlistRepositories.updatePlaylistRepository(
    id,
    data
  );
  return playlistAt;
}

async function deletePlaylistService(id) {
  const playlist = await playlistRepositories.getPlaylistByIdRepository(id);
  if (!playlist) throw new Error("Playlist não encontrada");
  await playlistRepositories.deletePlaylistRepository(id);
  return { message: "Playlist deletada com sucesso" };
}

async function getAllPlaylistService() {
  const playlists = await playlistRepositories.getAllPlaylistRepository();
  if (playlists.length == 0) return { message: "Nenhuma playlist cadastrada" };

  return playlists;
}

async function getPlaylistById(id) {
  const playlist = await playlistRepositories.getPlaylistByIdRepository(id);
  if (!playlist) throw new Error("Playlist não encontrada");

  return playlist;
}

export default {
  createPlaylistService,
  getAllPlaylistService,
  getPlaylistById,
  updatePlaylistService,
  deletePlaylistService,
};

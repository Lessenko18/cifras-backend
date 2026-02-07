import Playlist from "../models/Playlist.js";

async function createPlaylistRepository(data) {
  return Playlist.create(data);
}
async function getPlaylistViewRepository(id, userId, isAdmin = false) {
  const filter = isAdmin ? { _id: id } : { _id: id, criador: userId };
  return Playlist.findOne(filter)
    .populate("cifras", "nome observacao")
    .select("nome cifras");
}

async function updatePlaylistRepository(id, data, userId, isAdmin = false) {
  const filter = isAdmin ? { _id: id } : { _id: id, criador: userId };
  return Playlist.findOneAndUpdate(filter, data, { new: true });
}

async function deletePlaylistRepository(id, userId, isAdmin = false) {
  const filter = isAdmin ? { _id: id } : { _id: id, criador: userId };
  return Playlist.findOneAndDelete(filter);
}

async function getAllPlaylistRepository(userId, isAdmin = false) {
  const filter = isAdmin ? {} : { criador: userId };
  return Playlist.find(filter).sort({ _id: -1 });
}

async function getPlaylistByIdRepository(id, userId, isAdmin = false) {
  const filter = isAdmin ? { _id: id } : { _id: id, criador: userId };
  return Playlist.findOne(filter);
}

async function removeCifraFromAllPlaylists(cifraId) {
  return Playlist.updateMany(
    { cifras: cifraId },
    { $pull: { cifras: { _id: cifraId } } },
  );
}

export default {
  createPlaylistRepository,
  getAllPlaylistRepository,
  getPlaylistByIdRepository,
  updatePlaylistRepository,
  deletePlaylistRepository,
  removeCifraFromAllPlaylists,
  getPlaylistViewRepository,
};

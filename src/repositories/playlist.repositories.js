import Playlist from "../models/Playlist.js";

async function createPlaylistRepository(data) {
  return Playlist.create(data);
}
async function getPlaylistViewRepository(id) {
  return Playlist.findById(id)
    .populate("cifras", "nome observacao")
    .select("nome cifras");
}

async function updatePlaylistRepository(id, data) {
  return Playlist.findOneAndUpdate({ _id: id }, data, { new: true });
}

async function deletePlaylistRepository(id) {
  return Playlist.findByIdAndDelete(id);
}

async function getAllPlaylistRepository() {
  return Playlist.find().sort({ _id: -1 });
}

async function getPlaylistByIdRepository(id) {
  return Playlist.findById(id);
}

async function removeCifraFromAllPlaylists(cifraId) {
  return Playlist.updateMany(
    { cifras: cifraId },
    { $pull: { cifras: { _id: cifraId } } }
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

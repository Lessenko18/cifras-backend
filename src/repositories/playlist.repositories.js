import Playlist from "../models/Playlist.js";
import mongoose from "mongoose";

async function createPlaylistRepository(data) {
  return Playlist.create(data);
}

async function getPlaylistViewRepository(id, userId, isAdmin = false) {
  const filter = isAdmin
    ? { _id: new mongoose.Types.ObjectId(id) }
    : {
        _id: new mongoose.Types.ObjectId(id),
        $or: [
          { criador: new mongoose.Types.ObjectId(userId) },
          { sharedWith: new mongoose.Types.ObjectId(userId) },
        ],
      };
  return Playlist.findOne(filter)
    .populate("cifras", "nome observacao")
    .select("nome cifras");
}

async function updatePlaylistRepository(id, data, userId, isAdmin = false) {
  const filter = isAdmin
    ? { _id: new mongoose.Types.ObjectId(id) }
    : {
        _id: new mongoose.Types.ObjectId(id),
        $or: [
          { criador: new mongoose.Types.ObjectId(userId) },
          { sharedWith: new mongoose.Types.ObjectId(userId) },
        ],
      };
  return Playlist.findOneAndUpdate(filter, data, { new: true });
}

async function deletePlaylistRepository(id, userId, isAdmin = false) {
  const playlistId = new mongoose.Types.ObjectId(id);
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const filter = isAdmin
    ? { _id: playlistId }
    : {
        _id: playlistId,
        criador: userObjectId,
      };

  return Playlist.deleteOne(filter);
}

async function playlistExistsByIdRepository(id) {
  const playlistId = new mongoose.Types.ObjectId(id);
  const found = await Playlist.exists({ _id: playlistId });
  return Boolean(found);
}

async function getAllPlaylistRepository(userId, isAdmin = false) {
  const filter = isAdmin
    ? {}
    : {
        $or: [
          { criador: new mongoose.Types.ObjectId(userId) },
          { sharedWith: new mongoose.Types.ObjectId(userId) },
        ],
      };
  return Playlist.find(filter).sort({ _id: -1 });
}

async function getPlaylistByIdRepository(id, userId, isAdmin = false) {
  const filter = isAdmin
    ? { _id: new mongoose.Types.ObjectId(id) }
    : {
        _id: new mongoose.Types.ObjectId(id),
        criador: new mongoose.Types.ObjectId(userId),
      };
  return Playlist.findOne(filter);
}

async function getPlaylistByIdForReadRepository(id, userId, isAdmin = false) {
  const filter = isAdmin
    ? { _id: new mongoose.Types.ObjectId(id) }
    : {
        _id: new mongoose.Types.ObjectId(id),
        $or: [
          { criador: new mongoose.Types.ObjectId(userId) },
          { sharedWith: new mongoose.Types.ObjectId(userId) },
        ],
      };
  return Playlist.findOne(filter);
}

async function addUsersToSharedWithRepository(id, userIds) {
  return Playlist.findByIdAndUpdate(
    id,
    { $addToSet: { sharedWith: { $each: userIds } } },
    { new: true },
  );
}

async function removeUsersFromSharedWithRepository(id, userIds) {
  return Playlist.findByIdAndUpdate(
    id,
    { $pull: { sharedWith: { $in: userIds } } },
    { new: true },
  );
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
  getPlaylistByIdForReadRepository,
  addUsersToSharedWithRepository,
  removeUsersFromSharedWithRepository,
  playlistExistsByIdRepository,
};

import playlistService from "../service/playlist.service.js";

async function createPlaylistController(req, res) {
  try {
    const playlist = await playlistService.createPlaylistService(
      req.body,
      req.userId,
    );
    return res.status(201).send(playlist);
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function getPlaylistViewController(req, res) {
  const id = req.params.id;
  try {
    const playlist = await playlistService.getPlaylistViewService(
      id,
      req.userId,
      req.userLevel === "ADM",
    );
    return res.status(200).send(playlist);
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function updatePlaylistController(req, res) {
  const id = req.params.id;
  try {
    const playlist = await playlistService.updatePlaylistService(
      id,
      req.body,
      req.userId,
      req.userLevel === "ADM",
    );
    return res.status(200).send(playlist);
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function deletePlaylistController(req, res) {
  const id = req.params.id;
  try {
    await playlistService.deletePlaylistService(
      id,
      req.userId,
      req.userLevel === "ADM",
    );
    return res.status(200).send({ message: "Playlist deletada com sucesso" });
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function getAllPlaylistController(req, res) {
  try {
    const playlists = await playlistService.getAllPlaylistService(
      req.userId,
      req.userLevel === "ADM",
    );
    return res.status(200).send(playlists);
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function getPlaylistByIdController(req, res) {
  try {
    const playlist = await playlistService.getPlaylistById(
      req.params.id,
      req.userId,
      req.userLevel === "ADM",
    );
    return res.status(200).send(playlist);
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

export default {
  createPlaylistController,
  getAllPlaylistController,
  getPlaylistByIdController,
  updatePlaylistController,
  deletePlaylistController,
  getPlaylistViewController,
};

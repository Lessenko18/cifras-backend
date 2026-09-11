import playlistService from "../service/playlist.service.js";
import {
  getSignedAvatarUrl,
  resolveAvatarKey,
  uploadToS3,
} from "../middlewares/upload.middleware.js";

const PLAYLIST_BANNER_PREFIX = "playlists";

const toArray = (val) => {
  if (val === undefined || val === null || val === "") return undefined;
  return Array.isArray(val) ? val : [val];
};

async function resolveBannerUrl(bannerKey) {
  if (!bannerKey) return null;
  const key = resolveAvatarKey(bannerKey);
  if (!key) return null;
  try {
    return await getSignedAvatarUrl(key);
  } catch {
    return null;
  }
}

async function attachBannerUrl(playlist) {
  if (!playlist) return playlist;
  const obj = playlist.toObject ? playlist.toObject() : { ...playlist };
  obj.bannerUrl = await resolveBannerUrl(obj.banner);
  return obj;
}

async function createPlaylistController(req, res) {
  try {
    const payload = {
      ...req.body,
      cifras: toArray(req.body.cifras) ?? [],
      sharedWithEmails: toArray(req.body.sharedWithEmails),
    };

    if (req.file) {
      const uploadResult = await uploadToS3(req.file, PLAYLIST_BANNER_PREFIX);
      payload.banner = uploadResult.Key;
    }

    const playlist = await playlistService.createPlaylistService(
      payload,
      req.userId,
    );
    return res.status(201).send(await attachBannerUrl(playlist));
  } catch (error) {
    return res.status(error?.statusCode || 400).send(error.message);
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
    const payload = { ...req.body };
    if (payload.cifras !== undefined) payload.cifras = toArray(payload.cifras) ?? [];
    if (payload.sharedWithEmails !== undefined) {
      payload.sharedWithEmails = toArray(payload.sharedWithEmails);
    }

    if (req.file) {
      const uploadResult = await uploadToS3(req.file, PLAYLIST_BANNER_PREFIX);
      payload.banner = uploadResult.Key;
    }

    const playlist = await playlistService.updatePlaylistService(
      id,
      payload,
      req.userId,
      req.userLevel === "ADM",
    );
    return res.status(200).send(await attachBannerUrl(playlist));
  } catch (error) {
    return res.status(error?.statusCode || 400).send(error.message);
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
    const statusCode = Number.isInteger(error?.status) ? error.status : 400;
    return res
      .status(statusCode)
      .send({ message: error?.message || "Erro ao excluir playlist" });
  }
}

async function getAllPlaylistController(req, res) {
  try {
    const playlists = await playlistService.getAllPlaylistService(
      req.userId,
      req.userLevel === "ADM",
    );
    const withBanners = await Promise.all(playlists.map(attachBannerUrl));
    return res.status(200).send(withBanners);
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
    const bannerUrl = await resolveBannerUrl(playlist.banner);
    return res.status(200).send({ ...playlist, bannerUrl });
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function getPlaylistSharesController(req, res) {
  try {
    const result = await playlistService.getPlaylistSharedEmailsService(
      req.params.id,
      req.userId,
      req.userLevel === "ADM",
    );
    return res.status(200).send(result);
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function sharePlaylistController(req, res) {
  try {
    const result = await playlistService.sharePlaylistService(
      req.params.id,
      req.body.emails,
      req.userId,
      req.userLevel === "ADM",
    );
    return res.status(200).send(result);
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function unsharePlaylistController(req, res) {
  try {
    const result = await playlistService.unsharePlaylistService(
      req.params.id,
      req.body.emails,
      req.userId,
      req.userLevel === "ADM",
    );
    return res.status(200).send(result);
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

export default {
  createPlaylistController,
  getAllPlaylistController,
  getPlaylistByIdController,
  getPlaylistSharesController,
  updatePlaylistController,
  deletePlaylistController,
  getPlaylistViewController,
  sharePlaylistController,
  unsharePlaylistController,
};

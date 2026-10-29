import playlistService from "../service/playlist.service.js";
import { logAudit, auditLabel } from "../service/audit.service.js";
import {
  getSignedAvatarUrl,
  resolveAvatarKey,
  uploadToS3,
} from "../middlewares/upload.middleware.js";
import { sendError } from "../utils/httpError.js";

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

// Só estes campos vêm do cliente. `criador`, `sharedWith` etc. são definidos
// pelo servidor; `banner` só entra via upload (senão dava pra apontar pra
// qualquer arquivo do bucket e receber uma URL assinada dele).
const asStrings = (val) => (toArray(val) ?? []).filter((v) => typeof v === "string");

// "" limpa a data; string ISO válida define; ausente não altera.
function parseDataEvento(value) {
  if (value === undefined) return {};
  if (value === "" || value === null) return { dataEvento: null };
  const raw = String(value);
  // "AAAA-MM-DD" vira meio-dia UTC: evita cair no dia anterior no fuso do Brasil
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00.000Z` : raw);
  return Number.isNaN(d.getTime()) ? {} : { dataEvento: d };
}

async function createPlaylistController(req, res) {
  try {
    const payload = {
      nome: typeof req.body.nome === "string" ? req.body.nome : undefined,
      cifras: asStrings(req.body.cifras),
      ...parseDataEvento(req.body.dataEvento),
      sharedWithEmails: toArray(req.body.sharedWithEmails)?.filter(
        (v) => typeof v === "string",
      ),
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
    return sendError(res, error);
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
    return sendError(res, error);
  }
}

async function setPlaylistTomController(req, res) {
  try {
    const result = await playlistService.setPlaylistTomService(
      req.params.id,
      String(req.body?.cifraId ?? ""),
      req.body?.semitones,
      req.userId,
      req.userLevel === "ADM",
    );
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 400).json({ message: error.message });
  }
}

async function getPublicPlaylistController(req, res) {
  try {
    const result = await playlistService.getPublicPlaylistService(String(req.params.slug));
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 400).json({ message: error.message });
  }
}

async function setPublicLinkController(req, res) {
  try {
    const result = await playlistService.setPublicLinkService(
      req.params.id,
      req.method === "POST",
      req.userId,
      req.userLevel === "ADM",
    );
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 400).json({ message: error.message });
  }
}

async function updatePlaylistController(req, res) {
  const id = req.params.id;
  try {
    const payload = {};
    if (typeof req.body.nome === "string") payload.nome = req.body.nome;
    if (req.body.cifras !== undefined) payload.cifras = asStrings(req.body.cifras);
    Object.assign(payload, parseDataEvento(req.body.dataEvento));

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
    return sendError(res, error);
  }
}

async function deletePlaylistController(req, res) {
  const id = req.params.id;
  try {
    const label = await auditLabel("playlist", id);
    await playlistService.deletePlaylistService(
      id,
      req.userId,
      req.userLevel === "ADM",
    );
    logAudit(req, { action: "playlist_excluida", entity: "playlist", entityId: id, label });
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
    return sendError(res, error);
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
    return sendError(res, error);
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
    return sendError(res, error);
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
    return sendError(res, error);
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
    return sendError(res, error);
  }
}

export default {
  createPlaylistController,
  getPublicPlaylistController,
  setPublicLinkController,
  setPlaylistTomController,
  getAllPlaylistController,
  getPlaylistByIdController,
  getPlaylistSharesController,
  updatePlaylistController,
  deletePlaylistController,
  getPlaylistViewController,
  sharePlaylistController,
  unsharePlaylistController,
};

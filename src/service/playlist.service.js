import playlistRepositories from "../repositories/playlist.repositories.js";
import userRepositories from "../repositories/user.repositories.js";
import { sendMailBatch } from "./mail.service.js";
import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import { escapeHtml } from "../utils/escapeHtml.js";
import { freshChordPro } from "../utils/chordproFresh.js";


function normalizeComparableId(value, seen = new Set(), depth = 0) {
  if (!value) return "";
  if (depth > 6) return "";

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "bigint") {
    return String(value).trim();
  }

  if (typeof value === "object") {
    if (seen.has(value)) return "";
    seen.add(value);

    if (value.$oid) return String(value.$oid).trim();

    if (Object.prototype.hasOwnProperty.call(value, "_id") && value._id) {
      return normalizeComparableId(value._id, seen, depth + 1);
    }

    if (Object.prototype.hasOwnProperty.call(value, "id") && value.id) {
      return normalizeComparableId(value.id, seen, depth + 1);
    }
  }

  if (typeof value?.toString === "function") {
    const converted = value.toString().trim();
    if (converted && converted !== "[object Object]") {
      return converted;
    }
  }

  return "";
}

function isSameId(left, right) {
  const normalizedLeft = normalizeComparableId(left);
  const normalizedRight = normalizeComparableId(right);

  return (
    normalizedLeft.length > 0 &&
    normalizedRight.length > 0 &&
    normalizedLeft === normalizedRight
  );
}

function createServiceError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function buildPlaylistLink(playlistId) {
  const customPlaylistUrl = process.env.FRONTEND_PLAYLIST_URL;
  const frontendUrl =
    process.env.FRONTEND_URL ||
    process.env.CLIENT_URL ||
    process.env.APP_URL ||
    "http://localhost:5173";

  if (customPlaylistUrl) {
    if (customPlaylistUrl.includes(":id")) {
      return customPlaylistUrl.replace(":id", encodeURIComponent(playlistId));
    }
    const separator = customPlaylistUrl.includes("?") ? "&" : "?";
    return `${customPlaylistUrl}${separator}playlistId=${encodeURIComponent(playlistId)}`;
  }

  return `${frontendUrl}/home/playlists/${encodeURIComponent(playlistId)}/ver`;
}

async function sendPlaylistShareEmails({
  recipients,
  playlistName,
  playlistLink,
}) {
  const subject = "Você recebeu uma playlist - TL Cifras";

  const messages = (recipients || []).map((recipient) => ({
    to: recipient.email,
    subject,
    text: `Olá${recipient.name ? `, ${recipient.name}` : ""}!

Uma playlist foi compartilhada com você no TL Cifras.${playlistName ? `

Playlist: ${playlistName}` : ""}

Acesse pelo link:
${playlistLink}`,
    // Nome da playlist e do usuário são digitados por usuários: escapa pra
    // ninguém injetar HTML/links de phishing num e-mail enviado pelo app.
    html: `<p>Olá${recipient.name ? `, ${escapeHtml(recipient.name)}` : ""}!</p><p>Uma playlist foi compartilhada com você no TL Cifras.</p>${playlistName ? `<p><strong>Playlist:</strong> ${escapeHtml(playlistName)}</p>` : ""}<p>Acesse pelo link:</p><p><a href="${escapeHtml(playlistLink)}">${escapeHtml(playlistLink)}</a></p>`,
  }));

  return sendMailBatch(messages);
}

async function createPlaylistService(data, userId) {
  const payload = { ...data, criador: userId };

  if (
    Array.isArray(data.sharedWithEmails) &&
    data.sharedWithEmails.length > 0
  ) {
    const normalizedEmails = data.sharedWithEmails
      .map((email) => String(email).trim().toLowerCase())
      .filter(Boolean);

    const users = await userRepositories.findUsersByEmailList(normalizedEmails);
    const userIds = users.map((user) => user._id);

    if (userIds.length !== normalizedEmails.length) {
      const foundEmails = new Set(users.map((user) => user.email));
      const missing = normalizedEmails.filter(
        (email) => !foundEmails.has(email),
      );
      throw new Error(`Usuários não encontrados: ${missing.join(", ")}`);
    }

    payload.sharedWith = userIds;
  }

  delete payload.sharedWithEmails;
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
    toms: Object.fromEntries(playlist.toms || []),
    dataEvento: playlist.dataEvento || null,
    // só o dono (ou ADM) gerencia o link público
    podeCompartilharLink: isAdmin || isSameId(playlist.criador, userId),
    publicSlug:
      isAdmin || isSameId(playlist.criador, userId) ? playlist.publicSlug || null : null,
    musicas: (playlist.cifras || []).map((c) => ({
      id: c._id,
      nome: c.nome,
      artista: c.artista || "",
      bpm: c.bpm || null,
      descricao: c.observacao || "",
      chordpro: freshChordPro(c),
    })),
  };
}
async function updatePlaylistService(id, data, userId, isAdmin = false) {
  const playlist = await playlistRepositories.getPlaylistByIdForReadRepository(
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

async function setPlaylistTomService(id, cifraId, semitones, userId, isAdmin = false) {
  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(cifraId)) {
    throw createServiceError("Identificador inválido", 400);
  }
  if (!Number.isInteger(semitones) || semitones < -11 || semitones > 11) {
    throw createServiceError("Tom inválido", 400);
  }
  const playlist = await playlistRepositories.getPlaylistByIdForReadRepository(id, userId, isAdmin);
  if (!playlist) throw createServiceError("Playlist não encontrada", 404);
  if (!playlist.cifras.some((c) => isSameId(c, cifraId))) {
    throw createServiceError("Cifra não pertence à playlist", 400);
  }
  const updated = await playlistRepositories.setTomRepository(id, cifraId, semitones, userId, isAdmin);
  return { toms: Object.fromEntries(updated?.toms || []) };
}

function mapPublicMusicas(playlist) {
  return (playlist.cifras || []).map((c) => ({
    id: c._id,
    nome: c.nome,
    artista: c.artista || "",
    bpm: c.bpm || null,
    descricao: c.observacao || "",
    chordpro: freshChordPro(c),
  }));
}

async function getPublicPlaylistService(slug) {
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(slug)) {
    throw createServiceError("Playlist não encontrada", 404);
  }
  const playlist = await playlistRepositories.getPlaylistByPublicSlugRepository(slug);
  if (!playlist) throw createServiceError("Playlist não encontrada", 404);
  return {
    nome: playlist.nome,
    toms: Object.fromEntries(playlist.toms || []),
    dataEvento: playlist.dataEvento || null,
    musicas: mapPublicMusicas(playlist),
  };
}

// Liga/desliga o link público. Só o criador (ou ADM) pode.
async function setPublicLinkService(id, enable, userId, isAdmin = false) {
  if (!mongoose.isValidObjectId(id)) throw createServiceError("Identificador inválido", 400);
  const playlist = await playlistRepositories.getPlaylistByIdRepository(id, userId, isAdmin);
  if (!playlist) throw createServiceError("Playlist não encontrada", 404);
  const slug = enable ? playlist.publicSlug || randomBytes(9).toString("base64url") : null;
  await playlistRepositories.setPublicSlugRepository(id, slug);
  return { publicSlug: slug };
}

async function deletePlaylistService(id, userId, isAdmin = false) {
  if (!mongoose.isValidObjectId(id)) {
    throw createServiceError("ID de playlist inválido.", 400);
  }

  // 1. Buscamos a playlist ignorando o dono apenas para validar se ela existe
  const playlistExistente =
    await playlistRepositories.getPlaylistByIdRepository(id, userId, true);

  if (!playlistExistente) {
    throw createServiceError("Playlist não encontrada", 404);
  }

  // 2. Verificamos se o usuário logado é o criador ou ADM
  const eCriador = isSameId(playlistExistente.criador, userId);

  if (!isAdmin && !eCriador) {
    throw createServiceError(
      "Somente o criador ou ADM pode excluir a playlist.",
      403,
    );
  }

  // 3. Se passou na validação, deletamos passando isAdmin=true para o repositório deletar pelo ID
  const deleteResult = await playlistRepositories.deletePlaylistRepository(
    id,
    userId,
    true,
  );

  if (!deleteResult || deleteResult.deletedCount !== 1) {
    throw createServiceError(
      "Erro ao excluir a playlist. Tente novamente.",
      500,
    );
  }

  const stillExists =
    await playlistRepositories.playlistExistsByIdRepository(id);

  if (stillExists) {
    throw createServiceError(
      "A playlist não foi removida do banco. Tente novamente.",
      500,
    );
  }

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

  const sharedIds = (playlist.sharedWith || []).filter(Boolean);
  let sharedEmails = [];
  if (sharedIds.length > 0) {
    const users = await userRepositories.findUsersByIdList(sharedIds);
    sharedEmails = users.map((u) => u.email).filter(Boolean);
  }

  const playlistObj = playlist.toObject ? playlist.toObject() : { ...playlist };
  return { ...playlistObj, sharedEmails };
}

async function getPlaylistSharedEmailsService(playlistId, userId, isAdmin = false) {
  const playlist = await playlistRepositories.getPlaylistByIdRepository(
    playlistId,
    userId,
    isAdmin,
  );
  if (!playlist) throw new Error("Playlist não encontrada");

  const sharedIds = (playlist.sharedWith || []).filter(Boolean);
  if (sharedIds.length === 0) return { emails: [] };

  const users = await userRepositories.findUsersByIdList(sharedIds);
  return { emails: users.map((u) => u.email).filter(Boolean) };
}

async function sharePlaylistService(
  playlistId,
  emails,
  userId,
  isAdmin = false,
) {
  const playlist = await playlistRepositories.getPlaylistByIdRepository(
    playlistId,
    userId,
    isAdmin,
  );
  if (!playlist) throw new Error("Playlist não encontrada");

  const normalizedEmails = emails
    .map((email) => String(email).trim().toLowerCase())
    .filter(Boolean);

  const users = await userRepositories.findUsersByEmailList(normalizedEmails);
  const userIds = users.map((user) => user._id);

  if (userIds.length === 0) {
    throw new Error("Nenhum usuário encontrado com os e-mails fornecidos.");
  }

  await playlistRepositories.addUsersToSharedWithRepository(
    playlistId,
    userIds,
  );

  const playlistLink = buildPlaylistLink(playlistId);
  const emailResults = await sendPlaylistShareEmails({
    recipients: users.map((u) => ({ email: u.email, name: u.name })),
    playlistName: playlist.nome,
    playlistLink,
  });

  const foundEmails = new Set(users.map((u) => u.email.toLowerCase()));
  const missingEmails = normalizedEmails.filter((e) => !foundEmails.has(e));

  return {
    message: "Playlist compartilhada com sucesso",
    sharedWith: users.map((u) => u.email),
    notRegistered: missingEmails,
    emailStatus: emailResults,
  };
}

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

async function unsharePlaylistService(
  playlistId,
  emails,
  userId,
  isAdmin = false,
) {
  const playlist = await playlistRepositories.getPlaylistByIdRepository(
    playlistId,
    userId,
    isAdmin,
  );
  if (!playlist) throw new Error("Playlist não encontrada");

  const normalizedValues = emails.map((v) => String(v).trim()).filter(Boolean);

  // Raw ObjectIds belong to deleted users — use them directly for the $pull
  const rawObjectIds = normalizedValues
    .filter((v) => OBJECT_ID_PATTERN.test(v))
    .map((v) => new mongoose.Types.ObjectId(v));

  const emailList = normalizedValues
    .filter((v) => !OBJECT_ID_PATTERN.test(v))
    .map((v) => v.toLowerCase());

  let allUserIds = [...rawObjectIds];

  if (emailList.length > 0) {
    const users = await userRepositories.findUsersByEmailList(emailList);
    allUserIds = [...allUserIds, ...users.map((u) => u._id)];
  }

  if (allUserIds.length === 0) {
    throw new Error("Nenhum usuário encontrado com os e-mails fornecidos.");
  }

  await playlistRepositories.removeUsersFromSharedWithRepository(
    playlistId,
    allUserIds,
  );

  return {
    message: "Compartilhamento removido com sucesso",
    removed: emailList,
  };
}

export default {
  createPlaylistService,
  getPublicPlaylistService,
  setPublicLinkService,
  setPlaylistTomService,
  getAllPlaylistService,
  getPlaylistById,
  getPlaylistSharedEmailsService,
  updatePlaylistService,
  deletePlaylistService,
  getPlaylistViewService,
  sharePlaylistService,
  unsharePlaylistService,
};

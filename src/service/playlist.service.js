import playlistRepositories from "../repositories/playlist.repositories.js";
import userRepositories from "../repositories/user.repositories.js";

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
    musicas: (playlist.cifras || []).map((c) => ({
      id: c._id,
      nome: c.nome,
      descricao: c.observacao || "",
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
  const playlist = await playlistRepositories.getPlaylistByIdForReadRepository(
    id,
    userId,
    isAdmin,
  );
  if (!playlist) throw new Error("Playlist não encontrada");

  return playlist;
}

async function sharePlaylistService(id, emails, userId, isAdmin = false) {
  if (!Array.isArray(emails) || emails.length === 0) {
    throw new Error("Informe ao menos um email");
  }

  const playlist = await playlistRepositories.getPlaylistByIdRepository(
    id,
    userId,
    isAdmin,
  );
  if (!playlist) throw new Error("Playlist não encontrada");

  const normalizedEmails = emails
    .map((email) => String(email).trim().toLowerCase())
    .filter(Boolean);

  const users = await userRepositories.findUsersByEmailList(normalizedEmails);
  const userIds = users.map((user) => user._id);

  if (userIds.length !== normalizedEmails.length) {
    const foundEmails = new Set(users.map((user) => user.email));
    const missing = normalizedEmails.filter((email) => !foundEmails.has(email));
    throw new Error(`Usuários não encontrados: ${missing.join(", ")}`);
  }

  // Evita compartilhar com o próprio criador
  const filteredUserIds = userIds.filter(
    (id) => String(id) !== String(playlist.criador),
  );

  await playlistRepositories.addUsersToSharedWithRepository(
    id,
    filteredUserIds,
  );

  return { message: "Playlist compartilhada com sucesso" };
}

async function unsharePlaylistService(id, emails, userId, isAdmin = false) {
  if (!Array.isArray(emails) || emails.length === 0) {
    throw new Error("Informe ao menos um email");
  }

  const playlist = await playlistRepositories.getPlaylistByIdRepository(
    id,
    userId,
    isAdmin,
  );
  if (!playlist) throw new Error("Playlist não encontrada");

  const normalizedEmails = emails
    .map((email) => String(email).trim().toLowerCase())
    .filter(Boolean);

  const users = await userRepositories.findUsersByEmailList(normalizedEmails);
  const userIds = users.map((user) => user._id);

  if (userIds.length !== normalizedEmails.length) {
    const foundEmails = new Set(users.map((user) => user.email));
    const missing = normalizedEmails.filter((email) => !foundEmails.has(email));
    throw new Error(`Usuários não encontrados: ${missing.join(", ")}`);
  }

  await playlistRepositories.removeUsersFromSharedWithRepository(id, userIds);

  return { message: "Compartilhamento removido com sucesso" };
}

export default {
  createPlaylistService,
  getAllPlaylistService,
  getPlaylistById,
  updatePlaylistService,
  deletePlaylistService,
  getPlaylistViewService,
  sharePlaylistService,
  unsharePlaylistService,
};

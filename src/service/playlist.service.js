import playlistRepositories from "../repositories/playlist.repositories.js";
import userRepositories from "../repositories/user.repositories.js";
import nodemailer from "nodemailer";

const SMTP_SEND_TIMEOUT_MS = Number(process.env.SMTP_SEND_TIMEOUT_MS) || 15000;

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

function createMailTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS) || 10000,
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS) || 10000,
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS) || 15000,
    auth: {
      user,
      pass,
    },
  });
}

async function withTimeout(promise, timeoutMs, timeoutMessage) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function sendPlaylistShareEmails({
  recipients,
  playlistName,
  playlistLink,
}) {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return {
      sent: true,
      failures: [],
    };
  }

  const transporter = createMailTransport();
  if (!transporter) {
    return {
      sent: false,
      reason: "Serviço de e-mail não configurado",
    };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const subject = "Você recebeu uma playlist - TL Cifras";

  const sendPromises = recipients.map((recipient) =>
    withTimeout(
      transporter.sendMail({
        from,
        to: recipient.email,
        subject,
        text: `Olá${recipient.name ? `, ${recipient.name}` : ""}!\n\nUma playlist foi compartilhada com você no TL Cifras.${playlistName ? `\n\nPlaylist: ${playlistName}` : ""}\n\nAcesse pelo link:\n${playlistLink}`,
        html: `<p>Olá${recipient.name ? `, ${recipient.name}` : ""}!</p><p>Uma playlist foi compartilhada com você no TL Cifras.</p>${playlistName ? `<p><strong>Playlist:</strong> ${playlistName}</p>` : ""}<p>Acesse pelo link:</p><p><a href="${playlistLink}">${playlistLink}</a></p>`,
      }),
      SMTP_SEND_TIMEOUT_MS,
      `Tempo limite excedido ao enviar e-mail para ${recipient.email}`,
    ),
  );

  const results = await Promise.allSettled(sendPromises);
  const failures = results
    .map((result, index) => ({ result, recipient: recipients[index] }))
    .filter(({ result }) => result.status === "rejected")
    .map(({ result, recipient }) => ({
      email: recipient.email,
      error: result.reason?.message || "Falha ao enviar e-mail",
    }));

  return {
    sent: failures.length < recipients.length,
    failures,
  };
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

  const recipients = users
    .filter((user) => String(user._id) !== String(playlist.criador))
    .map((user) => ({ email: user.email, name: user.name }));

  const playlistLink = buildPlaylistLink(id);
  const emailResult = await sendPlaylistShareEmails({
    recipients,
    playlistName: playlist.nome,
    playlistLink,
  });

  if (emailResult.failures?.length) {
    console.error("[SHARE_PLAYLIST][SEND_EMAIL_ERROR]", {
      playlistId: id,
      failures: emailResult.failures,
    });
  }

  if (!emailResult.sent) {
    return {
      message:
        "Playlist compartilhada com sucesso, mas não foi possível enviar os e-mails.",
    };
  }

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

import playlistRepositories from "../repositories/playlist.repositories.js";
import userRepositories from "../repositories/user.repositories.js";
import nodemailer from "nodemailer";
import mongoose from "mongoose";

const SMTP_SEND_TIMEOUT_MS = Number(process.env.SMTP_SEND_TIMEOUT_MS) || 15000;
const SMTP_VERIFY_TIMEOUT_MS =
  Number(process.env.SMTP_VERIFY_TIMEOUT_MS) || 12000;

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

function createMailTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    const missing = [];
    if (!host) missing.push("SMTP_HOST");
    if (!user) missing.push("SMTP_USER");
    if (!pass) missing.push("SMTP_PASS");

    return {
      transporter: null,
      reason: "Serviço de e-mail não configurado",
      missing,
    };
  }

  const smtpPort = Number(process.env.SMTP_PORT);
  const hasCustomPort = Number.isFinite(smtpPort) && smtpPort > 0;
  const secureFromEnv = process.env.SMTP_SECURE;
  const hasCustomSecure =
    typeof secureFromEnv === "string" && secureFromEnv.length > 0;

  const primaryPort = hasCustomPort ? smtpPort : 587;
  const primarySecure = hasCustomSecure
    ? secureFromEnv === "true"
    : primaryPort === 465;

  const fallbackPort = primaryPort === 465 ? 587 : 465;
  const fallbackSecure = fallbackPort === 465;
  const fallbackEnabled = process.env.SMTP_FALLBACK_ENABLED !== "false";

  const candidates = [{ port: primaryPort, secure: primarySecure }];
  if (fallbackEnabled) {
    const alreadyIncluded = candidates.some(
      (candidate) =>
        candidate.port === fallbackPort && candidate.secure === fallbackSecure,
    );

    if (!alreadyIncluded) {
      candidates.push({ port: fallbackPort, secure: fallbackSecure });
    }
  }

  return {
    transporter: null,
    reason: null,
    missing: [],
    host,
    user,
    pass,
    candidates,
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS) || 10000,
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS) || 10000,
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS) || 15000,
  };
}

function buildTransport(config, candidate) {
  return nodemailer.createTransport({
    host: config.host,
    port: candidate.port,
    secure: candidate.secure,
    connectionTimeout: config.connectionTimeout,
    greetingTimeout: config.greetingTimeout,
    socketTimeout: config.socketTimeout,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

async function resolveWorkingTransport(config) {
  const attempts = [];

  for (const candidate of config.candidates) {
    const transporter = buildTransport(config, candidate);

    try {
      await withTimeout(
        transporter.verify(),
        SMTP_VERIFY_TIMEOUT_MS,
        `Timeout ao verificar SMTP em ${config.host}:${candidate.port}`,
      );

      return {
        transporter,
        attempts,
        selected: candidate,
      };
    } catch (error) {
      attempts.push({
        host: config.host,
        port: candidate.port,
        secure: candidate.secure,
        error: error?.message || "Falha na conexão SMTP",
      });
    }
  }

  return {
    transporter: null,
    attempts,
    selected: null,
  };
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

  const transportConfig = createMailTransport();
  if (!transportConfig.host || !transportConfig.user || !transportConfig.pass) {
    return {
      sent: false,
      reason: transportConfig.reason,
      missing: transportConfig.missing,
    };
  }

  const transportResolution = await resolveWorkingTransport(transportConfig);
  if (!transportResolution.transporter) {
    return {
      sent: false,
      reason: "Não foi possível conectar ao servidor SMTP",
      attempts: transportResolution.attempts,
      failures: recipients.map((recipient) => ({
        email: recipient.email,
        error: "Connection timeout",
      })),
    };
  }

  const transporter = transportResolution.transporter;

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
    attempts: transportResolution.attempts,
    selectedTransport: transportResolution.selected,
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

  return playlist;
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

  const normalizedEmails = emails
    .map((email) => String(email).trim().toLowerCase())
    .filter(Boolean);

  const users = await userRepositories.findUsersByEmailList(normalizedEmails);
  const userIds = users.map((user) => user._id);

  if (userIds.length === 0) {
    throw new Error("Nenhum usuário encontrado com os e-mails fornecidos.");
  }

  await playlistRepositories.removeUsersFromSharedWithRepository(
    playlistId,
    userIds,
  );

  return {
    message: "Compartilhamento removido com sucesso",
    removed: users.map((u) => u.email),
  };
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

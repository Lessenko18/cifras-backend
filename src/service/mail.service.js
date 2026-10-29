import nodemailer from "nodemailer";

// Único ponto de envio de e-mail do backend (redefinição de senha, playlist
// compartilhada...). Antes existiam duas cópias, com configuração diferente.

const SEND_TIMEOUT_MS = () => Number(process.env.SMTP_SEND_TIMEOUT_MS) || 15000;
const VERIFY_TIMEOUT_MS = () => Number(process.env.SMTP_VERIFY_TIMEOUT_MS) || 12000;

export function isMailConfigured() {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
  );
}

export async function withTimeout(promise, timeoutMs, timeoutMessage) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const timeoutError = new Error(timeoutMessage);
      timeoutError.statusCode = 504;
      reject(timeoutError);
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

// Lê o SMTP do ambiente. Tenta a porta configurada e, se ela falhar, a alternativa
// (465 <-> 587), a menos que SMTP_FALLBACK_ENABLED=false.
function readConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  const missing = [];
  if (!host) missing.push("SMTP_HOST");
  if (!user) missing.push("SMTP_USER");
  if (!pass) missing.push("SMTP_PASS");
  if (missing.length) return { configured: false, missing };

  const smtpPort = Number(process.env.SMTP_PORT);
  const primaryPort = Number.isFinite(smtpPort) && smtpPort > 0 ? smtpPort : 587;
  const secureFromEnv = process.env.SMTP_SECURE;
  const primarySecure =
    typeof secureFromEnv === "string" && secureFromEnv.length > 0
      ? secureFromEnv === "true"
      : primaryPort === 465;

  const candidates = [{ port: primaryPort, secure: primarySecure }];
  if (process.env.SMTP_FALLBACK_ENABLED !== "false") {
    const fallbackPort = primaryPort === 465 ? 587 : 465;
    candidates.push({ port: fallbackPort, secure: fallbackPort === 465 });
  }

  return {
    configured: true,
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

async function resolveWorkingTransport(config) {
  const attempts = [];

  for (const candidate of config.candidates) {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: candidate.port,
      secure: candidate.secure,
      connectionTimeout: config.connectionTimeout,
      greetingTimeout: config.greetingTimeout,
      socketTimeout: config.socketTimeout,
      auth: { user: config.user, pass: config.pass },
    });

    try {
      await withTimeout(
        transporter.verify(),
        VERIFY_TIMEOUT_MS(),
        `Timeout ao verificar SMTP em ${config.host}:${candidate.port}`,
      );
      return { transporter, attempts, selected: candidate };
    } catch (error) {
      attempts.push({
        host: config.host,
        port: candidate.port,
        secure: candidate.secure,
        error: error?.message || "Falha na conexão SMTP",
      });
    }
  }

  return { transporter: null, attempts, selected: null };
}

/**
 * Envia várias mensagens pela mesma conexão. Nunca lança: devolve
 * { sent, failures, reason?, missing?, attempts?, selectedTransport? }.
 * `sent` é true se ao menos uma saiu.
 * Cada mensagem: { to, subject, text, html }.
 */
export async function sendMailBatch(messages, { from, replyTo } = {}) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { sent: true, failures: [] };
  }

  const config = readConfig();
  if (!config.configured) {
    return {
      sent: false,
      reason: "Serviço de e-mail não configurado",
      missing: config.missing,
    };
  }

  const resolution = await resolveWorkingTransport(config);
  if (!resolution.transporter) {
    return {
      sent: false,
      reason: "Não foi possível conectar ao servidor SMTP",
      attempts: resolution.attempts,
      failures: messages.map((m) => ({ email: m.to, error: "Connection timeout" })),
    };
  }

  const sender = from || process.env.SMTP_FROM || process.env.SMTP_USER;
  const results = await Promise.allSettled(
    messages.map((m) =>
      withTimeout(
        resolution.transporter.sendMail({ from: sender, replyTo, ...m }),
        SEND_TIMEOUT_MS(),
        `Tempo limite excedido ao enviar e-mail para ${m.to}`,
      ),
    ),
  );

  const failures = results
    .map((result, i) => ({ result, message: messages[i] }))
    .filter(({ result }) => result.status === "rejected")
    .map(({ result, message }) => ({
      email: message.to,
      error: result.reason?.message || "Falha ao enviar e-mail",
    }));

  return {
    sent: failures.length < messages.length,
    failures,
    attempts: resolution.attempts,
    selectedTransport: resolution.selected,
  };
}

/** Envia uma mensagem; lança Error com statusCode se não conseguir. */
export async function sendMail(message, options) {
  const result = await sendMailBatch([message], options);
  if (result.sent) return result;

  const error = new Error(result.failures?.[0]?.error || result.reason || "Falha ao enviar e-mail");
  error.statusCode = result.missing ? 500 : 504;
  error.details = result;
  throw error;
}

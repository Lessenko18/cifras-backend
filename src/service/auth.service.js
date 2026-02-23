import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import userRepository from "../repositories/user.repositories.js";

const RESET_TOKEN_TTL_MS =
  Number(process.env.RESET_PASSWORD_TOKEN_TTL_MS) || 1000 * 60 * 30;
const SMTP_SEND_TIMEOUT_MS = Number(process.env.SMTP_SEND_TIMEOUT_MS) || 15000;
const FORGOT_PASSWORD_SUCCESS_MESSAGE =
  "Se o e-mail existir na base, você receberá as instruções para redefinir a senha.";

function buildResetPasswordLink(token) {
  const customResetUrl = process.env.FRONTEND_RESET_PASSWORD_URL;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  const baseUrl = customResetUrl || `${frontendUrl}/reset-password`;
  const separator = baseUrl.includes("?") ? "&" : "?";

  return `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
}

function createMailTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    const error = new Error("Serviço de e-mail não configurado");
    error.statusCode = 500;
    throw error;
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

function hasSmtpConfig() {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
  );
}

async function sendResetPasswordEmail({ toEmail, userName, resetLink }) {
  const transporter = createMailTransport();
  const from = process.env.SMTP_USER;
  const replyTo = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from,
    replyTo,
    to: toEmail,
    subject: "Redefinição de senha - TL Cifras",
    text: `Olá${userName ? `, ${userName}` : ""}!\n\nRecebemos uma solicitação para redefinir sua senha.\nUse o link abaixo para criar uma nova senha:\n${resetLink}\n\nEste link expira em 30 minutos.\nSe você não solicitou essa alteração, ignore este e-mail.`,
    html: `<p>Olá${userName ? `, ${userName}` : ""}!</p><p>Recebemos uma solicitação para redefinir sua senha.</p><p>Use o link abaixo para criar uma nova senha:</p><p><a href="${resetLink}">${resetLink}</a></p><p>Este link expira em 30 minutos.</p><p>Se você não solicitou essa alteração, ignore este e-mail.</p>`,
  });
}

export async function register({ name, email, password }) {
  const userExists = await userRepository.findUserByEmail(email);

  if (userExists) {
    throw new Error("Usuário já existe");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await userRepository.createUserRepository({
    name,
    email,
    password: hashedPassword,
    level: "USER",
  });

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    level: user.level,
  };
}

export async function login(email, password, remember = false) {
  const user = await userRepository.findUserByEmail(email);

  if (!user) {
    throw new Error("Usuário não encontrado");
  }

  const senhaValida = await bcrypt.compare(password, user.password);

  if (!senhaValida) {
    throw new Error("Senha inválida");
  }

  const token = jwt.sign(
    { id: user._id, email: user.email, level: user.level },
    process.env.JWT_SECRET,
    { expiresIn: remember ? "30d" : "8h" },
  );

  return { token };
}

export async function forgotPassword(email) {
  if (!email) {
    throw new Error("E-mail é obrigatório");
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await userRepository.findUserByEmail(normalizedEmail);

  if (!user) {
    return { message: FORGOT_PASSWORD_SUCCESS_MESSAGE };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await userRepository.updateUserRepository(user._id, {
    resetPasswordToken: hashedToken,
    resetPasswordExpires: expiresAt,
  });

  const resetLink = buildResetPasswordLink(resetToken);

  if (!hasSmtpConfig()) {
    if (process.env.NODE_ENV === "production") {
      await userRepository.updateUserRepository(user._id, {
        resetPasswordToken: null,
        resetPasswordExpires: null,
      });

      const smtpError = new Error("Serviço de e-mail não configurado");
      smtpError.statusCode = 500;
      throw smtpError;
    }

    console.warn(
      "[FORGOT_PASSWORD][DEV] SMTP não configurado. Link de reset:",
      resetLink,
    );
    return { message: FORGOT_PASSWORD_SUCCESS_MESSAGE };
  }

  try {
    await withTimeout(
      sendResetPasswordEmail({
        toEmail: user.email,
        userName: user.name,
        resetLink,
      }),
      SMTP_SEND_TIMEOUT_MS,
      "Tempo limite excedido ao enviar e-mail de redefinição",
    );
  } catch (error) {
    console.error("[FORGOT_PASSWORD][SEND_ERROR]", {
      email: user.email,
      code: error?.code,
      command: error?.command,
      responseCode: error?.responseCode,
      response: error?.response,
      message: error?.message,
    });

    await userRepository.updateUserRepository(user._id, {
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    const sendEmailError = new Error(
      "Não foi possível enviar o e-mail de redefinição no momento",
    );
    sendEmailError.statusCode = error.statusCode || 500;
    throw sendEmailError;
  }

  return { message: FORGOT_PASSWORD_SUCCESS_MESSAGE };
}

export async function resetPassword(token, newPassword) {
  if (!token) {
    throw new Error("Token é obrigatório");
  }

  if (!newPassword) {
    throw new Error("Nova senha é obrigatória");
  }

  if (String(newPassword).length < 6) {
    throw new Error("A nova senha deve ter pelo menos 6 caracteres");
  }

  const hashedToken = crypto
    .createHash("sha256")
    .update(String(token))
    .digest("hex");
  const user = await userRepository.findUserByResetToken(hashedToken);

  if (!user) {
    throw new Error("Token inválido ou expirado");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await userRepository.updateUserRepository(user._id, {
    password: hashedPassword,
    resetPasswordToken: null,
    resetPasswordExpires: null,
  });

  return { message: "Senha redefinida com sucesso" };
}

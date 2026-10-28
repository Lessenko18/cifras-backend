import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { isMailConfigured, sendMail } from "./mail.service.js";
import userRepository from "../repositories/user.repositories.js";
import { escapeHtml } from "../utils/escapeHtml.js";

const RESET_TOKEN_TTL_MS =
  Number(process.env.RESET_PASSWORD_TOKEN_TTL_MS) || 1000 * 60 * 30;
const FORGOT_PASSWORD_SUCCESS_MESSAGE =
  "Se o e-mail existir na base, você receberá as instruções para redefinir a senha.";

function buildResetPasswordLink(token) {
  const customResetUrl = process.env.FRONTEND_RESET_PASSWORD_URL;
  const frontendUrl =
    process.env.FRONTEND_URL ||
    process.env.CLIENT_URL ||
    process.env.APP_URL ||
    "http://localhost:5173";

  const baseUrl = customResetUrl || `${frontendUrl}/reset-password`;
  const separator = baseUrl.includes("?") ? "&" : "?";

  return `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
}

async function sendResetPasswordEmail({ toEmail, userName, resetLink }) {
  await sendMail({
    to: toEmail,
    subject: "Redefinição de senha - TL Cifras",
    text: `Olá${userName ? `, ${userName}` : ""}!\n\nRecebemos uma solicitação para redefinir sua senha.\nUse o link abaixo para criar uma nova senha:\n${resetLink}\n\nEste link expira em 30 minutos.\nSe você não solicitou essa alteração, ignore este e-mail.`,
    html: `<p>Olá${userName ? `, ${escapeHtml(userName)}` : ""}!</p><p>Recebemos uma solicitação para redefinir sua senha.</p><p>Use o link abaixo para criar uma nova senha:</p><p><a href="${escapeHtml(resetLink)}">${escapeHtml(resetLink)}</a></p><p>Este link expira em 30 minutos.</p><p>Se você não solicitou essa alteração, ignore este e-mail.</p>`,
  }, {
    from: process.env.SMTP_USER,
    replyTo: process.env.SMTP_FROM || process.env.SMTP_USER,
  });
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Hash de uma senha fictícia: usado quando o e-mail não existe, pra o login levar
// o mesmo tempo nos dois casos (evita descobrir e-mails pelo tempo de resposta).
const DUMMY_PASSWORD_HASH = "$2b$10$e7OheOtACQ3/djF0qx.wI.UOlBriCNw.DNm29ngpPqc.nZ9YwIs7a";
const INVALID_CREDENTIALS_MESSAGE = "E-mail ou senha inválidos";

export async function register({ name, email, password }) {
  if (typeof name !== "string" || name.trim().length < 2 || name.length > 100) {
    throw new Error("Informe um nome válido");
  }
  if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim()) || email.length > 200) {
    throw new Error("Informe um e-mail válido");
  }
  if (typeof password !== "string" || password.length < 6) {
    throw new Error("A senha deve ter pelo menos 6 caracteres");
  }
  if (Buffer.byteLength(password) > 72) {
    throw new Error("A senha é muito longa (máximo de 72 caracteres)");
  }

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

  // Sempre roda o bcrypt (mesmo sem usuário) e devolve a mesma mensagem: assim
  // não dá pra descobrir quais e-mails existem pela resposta nem pelo tempo.
  const senhaValida = await bcrypt.compare(
    String(password ?? ""),
    user ? user.password : DUMMY_PASSWORD_HASH,
  );

  if (!user || !senhaValida) {
    throw new Error(INVALID_CREDENTIALS_MESSAGE);
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

  if (!isMailConfigured()) {
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
    await sendResetPasswordEmail({
      toEmail: user.email,
      userName: user.name,
      resetLink,
    });
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

  if (Buffer.byteLength(String(newPassword)) > 72) {
    throw new Error("A senha é muito longa (máximo de 72 caracteres)");
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
    passwordChangedAt: new Date(),
    resetPasswordToken: null,
    resetPasswordExpires: null,
  });

  return { message: "Senha redefinida com sucesso" };
}

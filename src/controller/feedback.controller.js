import jwt from "jsonwebtoken";
import Feedback, { FEEDBACK_TIPOS } from "../models/Feedback.js";
import { logAudit } from "../service/audit.service.js";

const MIN_FILL_TIME_MS = 3000;

// Envio é público; se vier um token válido, associa o relato ao usuário logado.
function getUserIdFromRequest(req) {
  const authHeader = req.headers.authorization;
  let token = req.cookies?.access_token;

  if (authHeader) {
    const [scheme, bearerToken] = authHeader.split(" ");
    if (/^Bearer$/i.test(scheme) && bearerToken) token = bearerToken;
  }
  if (!token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET)?.id || null;
  } catch {
    return null;
  }
}

async function createFeedbackController(req, res) {
  try {
    const { tipo, mensagem, referencia, contato, website, tempoMs } = req.body || {};

    // Anti-bot: o campo "website" fica invisível pra pessoas (honeypot) e bots
    // costumam preenchê-lo; além disso, humanos levam alguns segundos pra
    // escrever. Nesses casos responde "ok" sem salvar, pra não dar pista ao bot.
    if (website || !(Number(tempoMs) >= MIN_FILL_TIME_MS)) {
      return res.status(201).json({ message: "Obrigado! Seu relato foi enviado." });
    }

    if (!FEEDBACK_TIPOS.includes(tipo)) {
      return res.status(400).json({ message: "Tipo de relato inválido" });
    }
    if (typeof mensagem !== "string" || mensagem.trim().length < 5) {
      return res
        .status(400)
        .json({ message: "Descreva o problema ou a melhoria (mín. 5 caracteres)" });
    }

    await Feedback.create({
      tipo,
      mensagem,
      referencia: typeof referencia === "string" ? referencia : "",
      contato: typeof contato === "string" ? contato : "",
      user: getUserIdFromRequest(req),
    });

    return res.status(201).json({ message: "Obrigado! Seu relato foi enviado." });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: "Dados inválidos. Verifique os campos." });
    }
    return res.status(500).json({ message: "Erro ao enviar relato" });
  }
}

async function getAllFeedbackController(req, res) {
  try {
    const feedbacks = await Feedback.find()
      .populate("user", "name email")
      .sort({ lido: 1, createdAt: -1 })
      .lean();
    return res.status(200).json(feedbacks);
  } catch (error) {
    return res.status(500).json({ message: "Erro ao buscar relatos" });
  }
}

async function setLidoFeedbackController(req, res) {
  try {
    const lido = req.body?.lido !== false;
    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { lido },
      { new: true },
    ).lean();
    if (!feedback) return res.status(404).json({ message: "Relato não encontrado" });
    return res.status(200).json(feedback);
  } catch (error) {
    return res.status(400).json({ message: "ID inválido" });
  }
}

async function deleteFeedbackController(req, res) {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) return res.status(404).json({ message: "Relato não encontrado" });
    logAudit(req, {
      action: "relato_excluido",
      entity: "relato",
      entityId: req.params.id,
      label: feedback.mensagem?.slice(0, 80),
    });
    return res.status(200).json({ message: "Relato excluído" });
  } catch (error) {
    return res.status(400).json({ message: "ID inválido" });
  }
}

export default {
  createFeedbackController,
  getAllFeedbackController,
  setLidoFeedbackController,
  deleteFeedbackController,
};

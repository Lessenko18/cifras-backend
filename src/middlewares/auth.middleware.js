import jwt from "jsonwebtoken";
import userRepository from "../repositories/user.repositories.js";
import { allowedOrigins } from "../config/cors.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const tokenFromCookie = req.cookies?.access_token;
  let token = tokenFromCookie;
  let usingCookie = Boolean(tokenFromCookie);

  if (authHeader) {
    const parts = authHeader.split(" ");

    if (parts.length !== 2) {
      return res.status(401).json({ message: "Token mal formatado" });
    }

    const [scheme, bearerToken] = parts;

    if (!/^Bearer$/i.test(scheme)) {
      return res.status(401).json({ message: "Token mal formatado" });
    }

    token = bearerToken;
    usingCookie = false;
  }

  // CSRF: o cookie é enviado automaticamente pelo navegador (SameSite=None),
  // então em requisições que alteram dados exige Origin conhecido. Quem usa
  // o header Authorization não é afetado (o header não é enviado por terceiros).
  if (usingCookie && !SAFE_METHODS.has(req.method)) {
    const origin = req.headers.origin;
    if (!origin || !allowedOrigins.includes(origin)) {
      return res.status(403).json({ message: "Origem não permitida" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Token não fornecido" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userRepository.getUserByIdRepository(decoded.id);

    if (!user) {
      return res
        .status(401)
        .json({ message: "Usuário do token não encontrado" });
    }

    // Senha trocada/redefinida depois da emissão do token: sessão antiga morre.
    // (iat é em segundos; compara no mesmo nível pra não invalidar um login
    // feito no mesmo segundo da troca.)
    if (
      user.passwordChangedAt &&
      decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)
    ) {
      return res
        .status(401)
        .json({ message: "Sessão expirada. Faça login novamente." });
    }

    // Sempre usa dados reais do banco para autorização
    req.userId = user._id.toString();
    req.userLevel = user.level;
    req.user = user;

    return next();
  } catch (err) {
    return res.status(401).json({ message: "Token inválido" });
  }
};

// Middleware para bloquear usuários não ADM
export const denyNonAdm = (req, res, next) => {
  if (req.userLevel !== "ADM") {
    return res
      .status(403)
      .json({ message: "Acesso permitido apenas para ADM" });
  }

  return next();
};

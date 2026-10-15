import jwt from "jsonwebtoken";
import userRepository from "../repositories/user.repositories.js";

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const tokenFromCookie = req.cookies?.access_token;
  let token = tokenFromCookie;

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

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userLevel)) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    return next();
  };
};

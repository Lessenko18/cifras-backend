import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Token não fornecido" });
  }

  const parts = authHeader.split(" ");

  if (parts.length !== 2) {
    return res.status(401).json({ message: "Token mal formatado" });
  }

  const [scheme, token] = parts;

  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({ message: "Token mal formatado" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // salva infos do token no request
    req.userId = decoded.id;
    req.userLevel = decoded.level;

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

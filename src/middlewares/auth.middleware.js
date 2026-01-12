import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Token não fornecido." });
  }

  const parts = authHeader.split(" ");

  if (parts.length !== 2) {
    return res.status(401).json({ message: "Formato de token inválido." });
  }

  const [scheme, token] = parts;

  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({ message: "Token mal formatado." });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Token inválido ou expirado." });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      level: decoded.level,
    };

    return next();
  });
};

export const denyNonAdm = (req, res, next) => {
  if (req.user.level !== "ADM") {
    return res.status(403).json({
      message: "Somente administradores podem realizar esta ação.",
    });
  }

  return next();
};

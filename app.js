import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import router from "./src/routes/index.js";
import connectDatabase from "./src/database/database.js";
import { allowedOrigins } from "./src/config/cors.js";
import { sanitizeRequest } from "./src/middlewares/sanitize.middleware.js";

const app = express();

// Necessário na Vercel (e qualquer proxy reverso) pra o Express confiar no
// header X-Forwarded-For e o express-rate-limit conseguir calcular o IP real.
app.set("trust proxy", 1);

// API 100% dinâmica e autenticada: desliga ETag e força no-store, senão o
// navegador (ou o service worker do PWA) revalida por ETag e reaproveita uma
// resposta antiga de /auth/me em outra sessão/login, escondendo dados novos
// (ex: avatar recém enviado) atrás de um 304.
app.set("etag", false);
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// Cabeçalhos de segurança (HSTS, nosniff, frame-ancestors etc.). CORP cross-origin
// porque o front (outro domínio) consome esta API.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const corsOptions = {
  origin:
    allowedOrigins.length === 0
      ? true
      : (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
          }

          return callback(new Error("Origin não permitida pelo CORS"));
        },
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
// Sem express.urlencoded de propósito: a API só aceita JSON/multipart, o que
// também impede POSTs de formulário cross-site (CSRF) sem preflight.
app.use(sanitizeRequest);
app.use(async (req, res, next) => {
  try {
    await connectDatabase();
    return next();
  } catch (error) {
    console.error("[DATABASE_CONNECTION_ERROR]", {
      message: error?.message,
      code: error?.code,
      name: error?.name,
    });

    return res.status(503).json({
      message: "Serviço temporariamente indisponível. Tente novamente.",
    });
  }
});
app.use(router);

app.use((err, req, res, next) => {
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      message: "Arquivo muito grande. Limite máximo de 10MB.",
    });
  }

  if (err?.statusCode) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  return next(err);
});

app.use((err, req, res, next) => {
  console.error("[UNHANDLED_ERROR]", {
    message: err?.message,
    stack: err?.stack,
  });

  return res.status(500).json({ message: "Erro interno do servidor" });
});

export default app;

import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./src/routes/index.js";
import connectDatabase from "./src/database/database.js";

const app = express();

const defaultDevOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

const envAllowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  process.env.APP_URL,
  ...(process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
].filter(Boolean);

const allowedOrigins = Array.from(
  new Set([...envAllowedOrigins, ...defaultDevOrigins]),
);

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
app.use(express.urlencoded({ extended: true }));
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
      message: "Arquivo muito grande. Limite máximo de 200MB.",
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

import "dotenv/config";
import express from "express";
import cors from "cors";
import router from "./src/routes/index.js";
import connectDatabase from "./src/database/database.js";

const app = express();

app.use(cors());
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

export default app;

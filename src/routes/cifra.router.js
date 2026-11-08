import { Router } from "express";
import { ipKeyGenerator } from "express-rate-limit";
import { createLimiter } from "../middlewares/rateLimit.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validateIdParam } from "../schemas/common.schema.js";
import cifraController from "../controller/cifra.controller.js";

const cifraRouter = Router();

// Todo `:id` deste router precisa ser um ObjectId (senão 400 antes do banco)
cifraRouter.param("id", validateIdParam);

// Contador de acessos é público: conta no máximo 1 acesso por IP a cada 10 min
// por cifra. Acessos repetidos continuam respondendo 204 (sem contar), então o
// front não percebe nada — só impede inflar o ranking com um script.
const acessoLimiter = createLimiter("cifra-acesso", {
  windowMs: 10 * 60 * 1000,
  limit: 1,
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${req.params.id}`,
  handler: (req, res) => res.status(204).send(),
});

// Rotas públicas (não requerem autenticação)
cifraRouter.get("/insights/home", cifraController.getHomeInsightsController);
cifraRouter.post("/:id/acesso", acessoLimiter, cifraController.registerCifraAccessController);
cifraRouter.get("/:id", cifraController.getCifraByIdController);
cifraRouter.get("/", cifraController.getAllCifraController);

// Rotas protegidas (requerem autenticação)
cifraRouter.post("/create", authMiddleware, cifraController.createCifraController);
cifraRouter.patch("/update/:id", authMiddleware, cifraController.updateCifraController);
cifraRouter.delete("/delete/:id", authMiddleware, cifraController.deleteCifraController);

export default cifraRouter;

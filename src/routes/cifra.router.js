import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import cifraController from "../controller/cifra.controller.js";

const cifraRouter = Router();

// Rotas públicas (não requerem autenticação)
cifraRouter.get("/:id", cifraController.getCifraByIdController);
cifraRouter.get("/", cifraController.getAllCifraController);

// Rotas protegidas (requerem autenticação)
cifraRouter.post("/create", authMiddleware, cifraController.createCifraController);
cifraRouter.patch("/update/:id", authMiddleware, cifraController.updateCifraController);
cifraRouter.delete("/delete/:id", authMiddleware, cifraController.deleteCifraController);

export default cifraRouter;

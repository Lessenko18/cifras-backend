import { Router } from "express";
import { authMiddleware, denyNonAdm } from "../middlewares/auth.middleware.js";
import categoriaController from "../controller/categoria.controller.js";

const categoriaRouter = Router();

// Todas as rotas de categoria exigem autenticação
categoriaRouter.use(authMiddleware);

// Leitura liberada para usuário autenticado
categoriaRouter.get("/search", categoriaController.searchCategoriaController);
categoriaRouter.get("/:id", categoriaController.getCategoriaByIdController);
categoriaRouter.get("/", categoriaController.getAllCategoriaController);

// Escrita restrita a ADM
categoriaRouter.post(
  "/create",
  denyNonAdm,
  categoriaController.createCategoriaController,
);

categoriaRouter.patch(
  "/update/:id",
  denyNonAdm,
  categoriaController.updateCategoriaController,
);
categoriaRouter.delete(
  "/delete/:id",
  denyNonAdm,
  categoriaController.deleteCategoriaController,
);

export default categoriaRouter;

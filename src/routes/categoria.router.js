import { Router } from "express";
import { authMiddleware, denyNonAdm } from "../middlewares/auth.middleware.js";
import categoriaController from "../controller/categoria.controller.js";

const categoriaRouter = Router();

// Rotas públicas
categoriaRouter.get("/search", categoriaController.searchCategoriaController);
categoriaRouter.get("/:id", categoriaController.getCategoriaByIdController);
categoriaRouter.get("/", categoriaController.getAllCategoriaController);

// Rotas protegidas
categoriaRouter.post(
  "/create",
  authMiddleware,
  denyNonAdm,
  categoriaController.createCategoriaController,
);

categoriaRouter.patch(
  "/update/:id",
  authMiddleware,
  categoriaController.updateCategoriaController,
);
categoriaRouter.delete(
  "/delete/:id",
  authMiddleware,
  denyNonAdm,
  categoriaController.deleteCategoriaController,
);

export default categoriaRouter;

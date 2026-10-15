import { Router } from "express";
import { authMiddleware, denyNonAdm } from "../middlewares/auth.middleware.js";
import categoriaController from "../controller/categoria.controller.js";

const categoriaRouter = Router();

// Leitura pública — categorias servem pra filtrar/rotular as cifras, que também são públicas
categoriaRouter.get("/search", categoriaController.searchCategoriaController);
categoriaRouter.get("/:id", categoriaController.getCategoriaByIdController);
categoriaRouter.get("/", categoriaController.getAllCategoriaController);

// Escrita restrita a ADM
categoriaRouter.post(
  "/create",
  authMiddleware,
  denyNonAdm,
  categoriaController.createCategoriaController,
);

categoriaRouter.patch(
  "/update/:id",
  authMiddleware,
  denyNonAdm,
  categoriaController.updateCategoriaController,
);
categoriaRouter.delete(
  "/delete/:id",
  authMiddleware,
  denyNonAdm,
  categoriaController.deleteCategoriaController,
);

export default categoriaRouter;

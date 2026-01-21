import { Router } from "express";
import { authMiddleware, denyNonAdm } from "../middlewares/auth.middleware.js";
import categoriaController from "../controller/categoria.controller.js";

const categoriaRouter = Router();

categoriaRouter.use(authMiddleware);

categoriaRouter.post(
  "/create",
  denyNonAdm,
  categoriaController.createCategoriaController,
);

categoriaRouter.patch(
  "/update/:id",
  categoriaController.updateCategoriaController,
);
categoriaRouter.delete(
  "/delete/:id",
  denyNonAdm,
  categoriaController.deleteCategoriaController,
);
categoriaRouter.get("/search", categoriaController.searchCategoriaController);
categoriaRouter.get("/:id", categoriaController.getCategoriaByIdController);
categoriaRouter.get("/", categoriaController.getAllCategoriaController);

export default categoriaRouter;

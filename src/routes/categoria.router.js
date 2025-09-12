import { Router } from "express";
import categoriaController from "../controller/categoria.controller.js";

const categoriaRouter = Router();

categoriaRouter.post("/create", categoriaController.createCategoriaController);
categoriaRouter.patch(
  "/update/:id",
  categoriaController.updateCategoriaController
);
categoriaRouter.delete(
  "/delete/:id",
  categoriaController.deleteCategoriaController
);
categoriaRouter.get("/search", categoriaController.searchCategoriaController);
categoriaRouter.get("/:id", categoriaController.getCategoriaByIdController);
categoriaRouter.get("/", categoriaController.getAllCategoriaController);

export default categoriaRouter;

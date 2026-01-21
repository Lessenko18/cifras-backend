import { Router } from "express";
import { authMiddleware, denyNonAdm } from "../middlewares/auth.middleware.js";
import cifraController from "../controller/cifra.controller.js";

const cifraRouter = Router();

cifraRouter.use(authMiddleware);

cifraRouter.get("/search", cifraController.searchCifraController);
cifraRouter.get(
  "/categoria/:categoria",
  cifraController.getCifraByCategoriaController,
);
cifraRouter.get("/:id", cifraController.getCifraByIdController);
cifraRouter.get("/", cifraController.getAllCifraController);
cifraRouter.post("/create", cifraController.createCifraController);
cifraRouter.patch("/update/:id", cifraController.updateCifraController);
cifraRouter.delete(
  "/delete/:id",
  denyNonAdm,
  cifraController.deleteCifraController,
);

export default cifraRouter;

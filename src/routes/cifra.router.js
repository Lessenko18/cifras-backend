import { Router } from "express";
import cifraController from "../controller/cifra.controller.js";

const cifraRouter = Router();

cifraRouter.post("/create", cifraController.createCifraController);
cifraRouter.patch("/update/:id", cifraController.updateCifraController);
cifraRouter.delete("/delete/:id", cifraController.deleteCifraController);
cifraRouter.get("/search", cifraController.searchCifraController);
cifraRouter.get("/:id", cifraController.getCifraByIdController);
cifraRouter.get("/", cifraController.getAllCifraController);

export default cifraRouter;

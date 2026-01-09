import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import playlistController from "../controller/playlist.controller.js";

const playlistRouter = Router();

playlistRouter.use(authMiddleware);

playlistRouter.get("/:id/view", playlistController.getPlaylistViewController);
playlistRouter.get("/:id", playlistController.getPlaylistByIdController);
playlistRouter.get("/", playlistController.getAllPlaylistController);
playlistRouter.post("/create", playlistController.createPlaylistController);
playlistRouter.patch(
  "/update/:id",
  playlistController.updatePlaylistController
);
playlistRouter.delete("/delete/:id");
playlistController.deletePlaylistController;

export default playlistRouter;

import { Router } from "express";
import { authMiddleware, denyNonAdm } from "../middlewares/auth.middleware.js";
import playlistController from "../controller/playlist.controller.js";

const playlistRouter = Router();

// Rotas protegidas (playlists são pessoais)
playlistRouter.get(
  "/:id/view",
  authMiddleware,
  playlistController.getPlaylistViewController,
);
playlistRouter.get(
  "/:id",
  authMiddleware,
  playlistController.getPlaylistByIdController,
);
playlistRouter.get(
  "/",
  authMiddleware,
  playlistController.getAllPlaylistController,
);

playlistRouter.post(
  "/create",
  authMiddleware,
  playlistController.createPlaylistController,
);

playlistRouter.patch(
  "/update/:id",
  authMiddleware,
  playlistController.updatePlaylistController,
);

playlistRouter.delete(
  "/delete/:id",
  authMiddleware,
  denyNonAdm,
  playlistController.deletePlaylistController,
);

export default playlistRouter;

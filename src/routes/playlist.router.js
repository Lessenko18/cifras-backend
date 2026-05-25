import { Router } from "express";
import { authMiddleware, denyNonAdm } from "../middlewares/auth.middleware.js";
import playlistController from "../controller/playlist.controller.js";

const playlistRouter = Router();

// Rotas com sub-segmentos devem vir ANTES de /:id para evitar captura prematura
playlistRouter.get(
  "/:id/view",
  authMiddleware,
  playlistController.getPlaylistViewController,
);
playlistRouter.get(
  "/:id/shares",
  authMiddleware,
  playlistController.getPlaylistSharesController,
);
playlistRouter.get(
  "/",
  authMiddleware,
  playlistController.getAllPlaylistController,
);
playlistRouter.get(
  "/:id",
  authMiddleware,
  playlistController.getPlaylistByIdController,
);

playlistRouter.post(
  "/create",
  authMiddleware,
  playlistController.createPlaylistController,
);

playlistRouter.post(
  "/:id/share",
  authMiddleware,
  playlistController.sharePlaylistController,
);

playlistRouter.delete(
  "/:id/share",
  authMiddleware,
  playlistController.unsharePlaylistController,
);

playlistRouter.patch(
  "/update/:id",
  authMiddleware,
  playlistController.updatePlaylistController,
);

playlistRouter.delete(
  "/delete/:id",
  authMiddleware,
  playlistController.deletePlaylistController,
);

export default playlistRouter;

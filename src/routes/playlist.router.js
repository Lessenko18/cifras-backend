import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authMiddleware, denyNonAdm } from "../middlewares/auth.middleware.js";
import playlistController from "../controller/playlist.controller.js";
import { upload } from "../middlewares/upload.middleware.js";

const playlistRouter = Router();

// Link público (sem login): limitado por IP e declarado antes de /:id
const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: false,
  legacyHeaders: false,
  message: { message: "Muitas requisições. Tente novamente em instantes." },
});
playlistRouter.get("/public/:slug", publicLimiter, playlistController.getPublicPlaylistController);

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
  upload.single("banner"),
  playlistController.createPlaylistController,
);

playlistRouter.post("/:id/public", authMiddleware, playlistController.setPublicLinkController);
playlistRouter.delete("/:id/public", authMiddleware, playlistController.setPublicLinkController);

playlistRouter.patch(
  "/:id/tom",
  authMiddleware,
  playlistController.setPlaylistTomController,
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
  upload.single("banner"),
  playlistController.updatePlaylistController,
);

playlistRouter.delete(
  "/delete/:id",
  authMiddleware,
  playlistController.deletePlaylistController,
);

export default playlistRouter;

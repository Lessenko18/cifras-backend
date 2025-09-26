import { Router } from "express";
import playlistController from "../controller/playlist.controller.js";

const playlistRouter = Router();

playlistRouter.post("/create", playlistController.createPlaylistController);
playlistRouter.patch(
  "/update/:id",
  playlistController.updatePlaylistController
);
playlistRouter.delete(
  "/delete/:id",
  playlistController.deletePlaylistController
);
playlistRouter.get("/:id", playlistController.getPlaylistByIdController);
playlistRouter.get("/", playlistController.getAllPlaylistController);
playlistRouter.get("/:id/view", playlistController.getPlaylistViewController);


export default playlistRouter;

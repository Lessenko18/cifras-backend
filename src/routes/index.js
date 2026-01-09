import { Router } from "express";
import userRouter from "./user.router.js";
import categoriaRouter from "./categoria.router.js";
import cifraRouter from "./cifra.router.js";
import playlistRouter from "./playlist.router.js";
import authRouter from "./auth.router.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/user", userRouter);
router.use("/categoria", categoriaRouter);
router.use("/cifra", cifraRouter);
router.use("/playlist", playlistRouter);

export default router;

import { Router } from "express";
import userRouter from "./user.router.js";
import categoriaRouter from "./categoria.router.js";
import cifraRouter from "./cifra.router.js";
import playlistRouter from "./playlist.router.js";
import authRouter from "./auth.router.js";
import feedbackRouter from "./feedback.router.js";
import auditRouter from "./audit.router.js";
import cspRouter from "./csp.router.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/user", userRouter);
router.use("/categoria", categoriaRouter);
router.use("/cifra", cifraRouter);
router.use("/playlist", playlistRouter);
router.use("/feedback", feedbackRouter);
router.use("/audit", auditRouter);
router.use("/csp-report", cspRouter);

export default router;

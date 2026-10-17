import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authMiddleware, denyNonAdm } from "../middlewares/auth.middleware.js";
import feedbackController from "../controller/feedback.controller.js";

const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitos relatos enviados. Tente novamente mais tarde." },
});

const feedbackRouter = Router();

// Envio público (com limite); quem envia logado fica associado ao relato
feedbackRouter.post("/", feedbackLimiter, feedbackController.createFeedbackController);

// Leitura e gestão: só ADM
feedbackRouter.get("/", authMiddleware, denyNonAdm, feedbackController.getAllFeedbackController);
feedbackRouter.patch(
  "/:id/lido",
  authMiddleware,
  denyNonAdm,
  feedbackController.setLidoFeedbackController,
);
feedbackRouter.delete(
  "/:id",
  authMiddleware,
  denyNonAdm,
  feedbackController.deleteFeedbackController,
);

export default feedbackRouter;

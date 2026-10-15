import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as authController from "../controller/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { logout } from "../controller/auth.controller.js";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas tentativas de login. Tente novamente em 15 minutos." },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas tentativas de cadastro. Tente novamente em 1 hora." },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas solicitações. Tente novamente em 15 minutos." },
});

const router = Router();

router.post("/login", loginLimiter, authController.login);
router.post("/register", registerLimiter, authController.register);
router.post("/forgot-password", forgotPasswordLimiter, authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.get("/me", authMiddleware, authController.me);
router.post("/logout", authMiddleware, logout);

export default router;

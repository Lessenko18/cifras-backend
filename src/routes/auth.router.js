import { Router } from "express";
import * as authController from "../controller/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js"; // 🔥 FALTAVA ISSO

const router = Router();

router.post("/login", authController.login);
router.post("/register", authController.register);

// rota /me protegida
router.get("/me", authMiddleware, authController.me);

export default router;

import { Router } from "express";
import * as authController from "../controller/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { logout } from "../controller/auth.controller.js";

const router = Router();

router.post("/login", authController.login);
router.post("/register", authController.register);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.get("/me", authMiddleware, authController.me);
router.post("/logout", authMiddleware, logout);

export default router;

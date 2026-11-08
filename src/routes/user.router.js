import { Router } from "express";
import { authMiddleware, denyNonAdm } from "../middlewares/auth.middleware.js";
import userController from "../controller/user.controller.js";
import { createLimiter } from "../middlewares/rateLimit.js";
import {
  avatarUploadRateLimit,
  upload,
} from "../middlewares/upload.middleware.js";

const userRouter = Router();

// Rotas que conferem a senha atual: limite próprio contra tentativa de adivinhar a senha
const sensitiveLimiter = createLimiter("user-sensitive", {
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas tentativas. Tente novamente em 15 minutos." },
});

// Todas as rotas exigem autenticação
userRouter.use(authMiddleware);

userRouter.post("/create", denyNonAdm, userController.createUserController);

userRouter.patch("/update/:id", sensitiveLimiter, userController.updateUserController);
userRouter.delete(
  "/delete/:id",
  denyNonAdm,
  userController.deleteUserController,
);

userRouter.get("/search", denyNonAdm, userController.searchUsersController);

userRouter.get("/", denyNonAdm, userController.getAllUserController);

// Atualizar perfil do usuário (com imagem)
userRouter.put(
  "/profile",
  sensitiveLimiter,
  upload.single("profileImage"),
  userController.updateProfile,
);

// Upload de avatar
userRouter.post(
  "/upload-avatar",
  avatarUploadRateLimit,
  upload.single("avatar"),
  userController.uploadAvatar,
);

// Renovar URL do avatar (para quando a URL pré-assinada expirar)
userRouter.post("/refresh-avatar-url", userController.refreshAvatarUrl);

// Favoritos — deve vir ANTES de /:id para não ser capturado como parâmetro
userRouter.get("/favoritos", userController.getFavoritosController);
userRouter.post("/favoritos/:cifraId", userController.toggleFavoritoController);

userRouter.get("/:id", userController.getUserByIdController);

export default userRouter;

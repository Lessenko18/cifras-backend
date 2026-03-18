import { Router } from "express";
import { authMiddleware, denyNonAdm } from "../middlewares/auth.middleware.js";
import userController from "../controller/user.controller.js";
import {
  avatarUploadRateLimit,
  upload,
} from "../middlewares/upload.middleware.js";

const userRouter = Router();

// Todas as rotas exigem autenticação
userRouter.use(authMiddleware);

userRouter.post("/create", denyNonAdm, userController.createUserController);

userRouter.patch("/update/:id", userController.updateUserController);
userRouter.delete(
  "/delete/:id",
  denyNonAdm,
  userController.deleteUserController,
);

userRouter.get("/search", denyNonAdm, userController.searchUsersController);

userRouter.get("/:id", userController.getUserByIdController);
userRouter.get("/", denyNonAdm, userController.getAllUserController);

// Atualizar perfil do usuário (com imagem)
userRouter.put(
  "/profile",
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

export default userRouter;

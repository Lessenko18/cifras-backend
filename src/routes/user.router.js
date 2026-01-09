import { Router } from "express";
import { authMiddleware, denyNonAdm } from "../middlewares/auth.middleware.js";
import userController from "../controller/user.controller.js";

const userRouter = Router();

userRouter.use(authMiddleware);

userRouter.post("/create", denyNonAdm, userController.createUserController);

userRouter.patch("/update/:id", userController.updateUserController);
userRouter.delete("/delete/:id", userController.deleteUserController);
userRouter.get("/:id", userController.getUserByIdController);
userRouter.get("/", userController.getAllUserController);

export default userRouter;

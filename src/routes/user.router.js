import { Router } from "express";
import userController from "../controller/user.controller.js";

const userRouter = Router();

userRouter.post("/create", userController.createUserController);
userRouter.patch("/update/:id", userController.updateUserController);
userRouter.delete("/delete/:id", userController.deleteUserController);
userRouter.get("/:id", userController.getUserByIdController);
userRouter.get("/", userController.getAllUserController);

export default userRouter;

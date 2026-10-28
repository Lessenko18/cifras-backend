import { Router } from "express";
import { authMiddleware, denyNonAdm } from "../middlewares/auth.middleware.js";
import auditController from "../controller/audit.controller.js";

const auditRouter = Router();

// Histórico de ações: só ADM
auditRouter.get("/", authMiddleware, denyNonAdm, auditController.getAuditLogsController);

export default auditRouter;
